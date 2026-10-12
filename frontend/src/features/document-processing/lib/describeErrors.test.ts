import { describe, expect, it } from 'vitest';
import type { RowErrorDto, UploadDto } from '../types/upload.types';
import { describeRowError, describeUploadFailure } from './describeErrors';

type FailureInput = Pick<UploadDto, 'errorCode' | 'errorMessage' | 'errorDetails'>;

function failure(partial: Partial<FailureInput>): FailureInput {
  return { errorCode: null, errorMessage: null, errorDetails: null, ...partial };
}

function rowError(partial: Partial<RowErrorDto>): RowErrorDto {
  return { row: 3, code: 'INVALID', message: 'raw english message', ...partial };
}

describe('describeUploadFailure', () => {
  it('lists only the non-empty header problems and offers the sample', () => {
    const result = describeUploadFailure(
      failure({
        errorCode: 'INVALID_HEADER',
        errorMessage: 'Invalid CSV header',
        errorDetails: { expected: [], missing: ['unit'], unexpected: ['price'], duplicated: ['amount'] },
      }),
    );

    expect(result.title).toBe('La primera fila del archivo no tiene las columnas esperadas');
    expect(result.lines).toEqual(['Faltan: unit', 'Sobran: price', 'Repetidas: amount']);
    expect(result.fix).toBe(
      'La cabecera debe tener exactamente estas cuatro columnas: category, amount, unit, date (en cualquier orden, en mayúsculas o minúsculas). Renombra o elimina las columnas señaladas y vuelve a subir el archivo.',
    );
    expect(result.where).toBe('Cabecera (primera línea del archivo)');
    expect(result.sampleLink).toBe(true);
  });

  it('renders an unnamed column and omits empty groups', () => {
    const result = describeUploadFailure(
      failure({ errorCode: 'INVALID_HEADER', errorDetails: { missing: [], unexpected: [''], duplicated: [] } }),
    );
    expect(result.lines).toEqual(['Sobran: (columna sin nombre)']);
  });

  it('tolerates missing or malformed header details', () => {
    expect(describeUploadFailure(failure({ errorCode: 'INVALID_HEADER' })).lines).toEqual([]);
    expect(describeUploadFailure(failure({ errorCode: 'INVALID_HEADER', errorDetails: { missing: 'date' } })).lines).toEqual([]);
  });

  it.each([
    ['EMPTY_FILE', 'El archivo está vacío', 'Exporta de nuevo la planilla como CSV y vuelve a subirla.'],
    ['NO_DATA_ROWS', 'El archivo solo tiene la fila de cabecera', 'Agrega al menos una fila de datos debajo de la cabecera.'],
    ['NO_VALID_ROWS', 'Ninguna fila pudo procesarse', 'Corrige las filas de la tabla de abajo y vuelve a subir el archivo.'],
  ])('describes %s', (code, title, fix) => {
    const result = describeUploadFailure(failure({ errorCode: code, errorMessage: 'English' }));
    expect(result).toMatchObject({ title, fix });
    expect(result.lines).toEqual([]);
    expect(result.sampleLink).toBeFalsy();
  });

  it('shows the reason of a malformed CSV', () => {
    const result = describeUploadFailure(failure({ errorCode: 'MALFORMED_CSV', errorDetails: { reason: 'Quote not closed' } }));
    expect(result.title).toBe('No se pudo leer el archivo como CSV');
    expect(result.lines).toEqual(['Detalle: Quote not closed']);
    expect(result.fix).toBe('Guárdalo como CSV separado por comas, codificado en UTF-8, y vuelve a intentarlo.');
  });

  it.each(['ENQUEUE_FAILED', 'PROCESSING_ERROR', 'SOMETHING_NEW'])('falls back to the generic text for %s', (code) => {
    const result = describeUploadFailure(failure({ errorCode: code, errorMessage: 'Queue down' }));
    expect(result.title).toBe('Ocurrió un problema al procesar el archivo');
    expect(result.lines).toEqual(['Queue down']);
    expect(result.fix).toBe('Vuelve a subir el archivo. Si se repite, avísanos.');
  });

  it('keeps the legacy title and raw message when there is no code', () => {
    const result = describeUploadFailure(failure({ errorMessage: 'Old failure' }));
    expect(result.title).toBe('El procesamiento falló');
    expect(result.lines).toEqual(['Old failure']);
    expect(result.fix).toBeUndefined();
  });

  it('has no lines when a legacy record has no message either', () => {
    expect(describeUploadFailure(failure({})).lines).toEqual([]);
  });
});

describe('describeRowError', () => {
  it('explains an empty cell', () => {
    expect(describeRowError(rowError({ code: 'REQUIRED', field: 'unit' }))).toBe('La celda está vacía. Completa el valor.');
  });

  it('quotes the invalid number', () => {
    expect(describeRowError(rowError({ code: 'INVALID_NUMBER', field: 'amount', value: '-12.5' }))).toBe(
      '«-12.5» no es un número válido. Usa un número positivo con punto decimal y hasta 4 decimales, sin separador de miles ni símbolos. Ejemplo: 150.5',
    );
  });

  it('explains zero amounts', () => {
    expect(describeRowError(rowError({ code: 'NOT_POSITIVE', field: 'amount', value: '0' }))).toBe(
      'El valor tiene que ser mayor que 0.',
    );
  });

  it.each([
    ['category', 100],
    ['unit', 20],
  ])('uses the max length of %s', (field, max) => {
    expect(describeRowError(rowError({ code: 'TOO_LONG', field }))).toBe(`Supera el máximo de ${max} caracteres. Acorta el texto.`);
  });

  it('explains control characters', () => {
    expect(describeRowError(rowError({ code: 'CONTROL_CHARACTERS', field: 'category', value: 'a�b' }))).toBe(
      'Contiene caracteres de control invisibles (por ejemplo, un salto de línea pegado). Vuelve a escribir la celda.',
    );
  });

  it('explains date format and calendar problems', () => {
    expect(describeRowError(rowError({ code: 'INVALID_DATE_FORMAT', field: 'date', value: '15/01/2024' }))).toBe(
      '«15/01/2024» no tiene el formato AAAA-MM-DD. Ejemplo: 2024-01-15',
    );
    expect(describeRowError(rowError({ code: 'INVALID_DATE', field: 'date', value: '2024-02-31' }))).toBe(
      '«2024-02-31» no es una fecha real del calendario. Revisa el día y el mes.',
    );
  });

  it('falls back to the raw message for unknown codes', () => {
    expect(describeRowError(rowError({ code: 'INVALID' }))).toBe('raw english message');
  });

  it('does not quote a value that is missing', () => {
    expect(describeRowError(rowError({ code: 'INVALID_NUMBER', field: 'amount' }))).toMatch(/^El valor no es un número válido\./);
    expect(describeRowError(rowError({ code: 'INVALID_DATE', field: 'date' }))).toMatch(/^El valor no es una fecha real/);
  });
});
