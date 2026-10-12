import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import { describe, expect, it } from 'vitest';
import { getApiErrorMessage } from './api-client';

function httpError(data: unknown, status = 400): AxiosError {
  const config = { headers: new AxiosHeaders() };
  const response = { data, status, statusText: '', headers: {}, config } as AxiosResponse;
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, undefined, response);
}

describe('getApiErrorMessage', () => {
  it.each([
    ['UNSUPPORTED_FILE', 'Solo se permiten archivos .csv'],
    ['FILE_TOO_LARGE', 'El archivo supera el tamaño máximo de 5 MB'],
    ['NOT_FOUND', 'Upload no encontrado'],
    ['VALIDATION_ERROR', 'Solicitud inválida'],
    ['STORAGE_ERROR', 'El servicio no está disponible. Vuelve a intentarlo en unos minutos.'],
    ['MESSAGING_ERROR', 'El servicio no está disponible. Vuelve a intentarlo en unos minutos.'],
  ])('maps the %s code to its Spanish message', (code, expected) => {
    const error = httpError({ error: { code, message: 'English backend message' }, requestId: 'r1' });
    expect(getApiErrorMessage(error)).toBe(expected);
  });

  it('does not append English details to the mapped message', () => {
    const error = httpError({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: [{ path: 'file', message: 'required' }] },
      requestId: 'r1',
    });
    expect(getApiErrorMessage(error)).toBe('Solicitud inválida');
  });

  it('maps an unknown code to the unexpected message instead of the English one', () => {
    const error = httpError({ error: { code: 'SOMETHING_NEW', message: 'Failed' }, requestId: 'r1' });
    expect(getApiErrorMessage(error)).toBe('Ocurrió un error inesperado');
  });

  it('maps an axios error without response to the network message', () => {
    const error = new AxiosError('Network Error', 'ERR_NETWORK');
    expect(getApiErrorMessage(error)).toBe('No se pudo conectar con el servidor');
  });

  it('maps an HTTP error with an unknown body to the unexpected message', () => {
    expect(getApiErrorMessage(httpError('<html>', 502))).toBe('Ocurrió un error inesperado');
  });

  it('maps non-axios errors to the unexpected message', () => {
    expect(getApiErrorMessage(new Error('boom'))).toBe('Ocurrió un error inesperado');
  });
});
