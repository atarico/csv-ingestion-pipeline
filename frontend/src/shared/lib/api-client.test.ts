import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import { describe, expect, it } from 'vitest';
import { getApiErrorMessage } from './api-client';

function httpError(data: unknown, status = 400): AxiosError {
  const config = { headers: new AxiosHeaders() };
  const response = { data, status, statusText: '', headers: {}, config } as AxiosResponse;
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, undefined, response);
}

describe('getApiErrorMessage', () => {
  it('returns the API error message', () => {
    const error = httpError({ error: { code: 'NOT_FOUND', message: 'Upload no encontrado' }, requestId: 'r1' }, 404);
    expect(getApiErrorMessage(error)).toBe('Upload no encontrado');
  });

  it('appends the first details message when present', () => {
    const error = httpError({
      error: { code: 'VALIDATION', message: 'Solicitud inválida', details: [{ path: 'file', message: 'requerido' }] },
      requestId: 'r1',
    });
    expect(getApiErrorMessage(error)).toBe('Solicitud inválida: requerido');
  });

  it('ignores details without a readable message', () => {
    const error = httpError({ error: { code: 'X', message: 'Falló', details: [{ path: 'file' }, 42] }, requestId: 'r1' });
    expect(getApiErrorMessage(error)).toBe('Falló');
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
