import type { RowErrorDto, UploadDto } from '../types/upload.types';

export interface FailureDescription {
  title: string;
  lines: string[];
  fix?: string;
  where?: string;
  sampleLink?: boolean;
}

type FailureSource = Pick<UploadDto, 'errorCode' | 'errorMessage' | 'errorDetails'>;

const HEADER_FIX =
  'La cabecera debe tener exactamente estas cuatro columnas: category, amount, unit, date (en cualquier orden, en mayúsculas o minúsculas). Renombra o elimina las columnas señaladas y vuelve a subir el archivo.';

const GENERIC_FAILURE: Pick<FailureDescription, 'title' | 'fix'> = {
  title: 'Ocurrió un problema al procesar el archivo',
  fix: 'Vuelve a subir el archivo. Si se repite, avísanos.',
};

const SIMPLE_FAILURES: Record<string, Pick<FailureDescription, 'title' | 'fix'>> = {
  EMPTY_FILE: {
    title: 'El archivo está vacío',
    fix: 'Exporta de nuevo la planilla como CSV y vuelve a subirla.',
  },
  NO_DATA_ROWS: {
    title: 'El archivo solo tiene la fila de cabecera',
    fix: 'Agrega al menos una fila de datos debajo de la cabecera.',
  },
  NO_VALID_ROWS: {
    title: 'Ninguna fila pudo procesarse',
    fix: 'Corrige las filas de la tabla de abajo y vuelve a subir el archivo.',
  },
};

const MAX_LENGTH_BY_FIELD: Record<string, number> = { category: 100, unit: 20 };

function names(details: UploadDto['errorDetails'], key: string): string[] {
  const value = details?.[key];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string').map((name) => (name === '' ? '(columna sin nombre)' : name));
}

function describeHeader(details: UploadDto['errorDetails']): FailureDescription {
  const lines = (
    [
      ['Faltan', 'missing'],
      ['Sobran', 'unexpected'],
      ['Repetidas', 'duplicated'],
    ] as const
  ).flatMap(([label, key]) => {
    const found = names(details, key);
    return found.length > 0 ? [`${label}: ${found.join(', ')}`] : [];
  });
  return {
    title: 'La primera fila del archivo no tiene las columnas esperadas',
    lines,
    fix: HEADER_FIX,
    where: 'Cabecera (primera línea del archivo)',
    sampleLink: true,
  };
}

/** Explains, in plain Spanish, why a FAILED upload failed; the API only sends English text plus a code. */
export function describeUploadFailure(upload: FailureSource): FailureDescription {
  const rawLines = upload.errorMessage ? [upload.errorMessage] : [];
  if (!upload.errorCode) return { title: 'El procesamiento falló', lines: rawLines };
  if (upload.errorCode === 'INVALID_HEADER') return describeHeader(upload.errorDetails);
  if (upload.errorCode === 'MALFORMED_CSV') {
    const reason = upload.errorDetails?.reason;
    return {
      title: 'No se pudo leer el archivo como CSV',
      lines: typeof reason === 'string' && reason !== '' ? [`Detalle: ${reason}`] : [],
      fix: 'Guárdalo como CSV separado por comas, codificado en UTF-8, y vuelve a intentarlo.',
    };
  }
  const simple = SIMPLE_FAILURES[upload.errorCode];
  if (simple) return { ...simple, lines: [] };
  return { ...GENERIC_FAILURE, lines: rawLines };
}

/** Explains one rejected row: what is wrong with the value and how to fix it. */
export function describeRowError(error: RowErrorDto): string {
  const quoted = error.value ? `«${error.value}»` : 'El valor';
  switch (error.code) {
    case 'REQUIRED':
      return 'La celda está vacía. Completa el valor.';
    case 'INVALID_NUMBER':
      return `${quoted} no es un número válido. Usa un número positivo con punto decimal y hasta 4 decimales, sin separador de miles ni símbolos. Ejemplo: 150.5`;
    case 'NOT_POSITIVE':
      return 'El valor tiene que ser mayor que 0.';
    case 'TOO_LONG':
      return `Supera el máximo de ${MAX_LENGTH_BY_FIELD[error.field ?? ''] ?? 100} caracteres. Acorta el texto.`;
    case 'CONTROL_CHARACTERS':
      return 'Contiene caracteres de control invisibles (por ejemplo, un salto de línea pegado). Vuelve a escribir la celda.';
    case 'INVALID_DATE_FORMAT':
      return `${quoted} no tiene el formato AAAA-MM-DD. Ejemplo: 2024-01-15`;
    case 'INVALID_DATE':
      return `${quoted} no es una fecha real del calendario. Revisa el día y el mes.`;
    default:
      return error.message;
  }
}
