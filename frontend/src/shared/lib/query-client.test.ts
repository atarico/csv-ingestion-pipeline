import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import { describe, expect, it } from 'vitest';
import { isClientError, shouldRetryQuery } from './query-client';

function axiosErrorWithStatus(status: number): AxiosError {
  const config = { headers: new AxiosHeaders() };
  const response = { status, statusText: '', data: null, headers: {}, config } as AxiosResponse;
  return new AxiosError('failed', String(status), config, null, response);
}

describe('isClientError', () => {
  it.each([400, 404, 422, 499])('is true for an axios %i', (status) => {
    expect(isClientError(axiosErrorWithStatus(status))).toBe(true);
  });

  it.each([500, 502, 503])('is false for an axios %i', (status) => {
    expect(isClientError(axiosErrorWithStatus(status))).toBe(false);
  });

  it('is false for a network error without a response and for non-axios errors', () => {
    expect(isClientError(new AxiosError('Network Error'))).toBe(false);
    expect(isClientError(new Error('boom'))).toBe(false);
    expect(isClientError('nope')).toBe(false);
  });
});

describe('shouldRetryQuery', () => {
  it('never retries a 4xx', () => {
    expect(shouldRetryQuery(0, axiosErrorWithStatus(404))).toBe(false);
  });

  it('retries a 5xx or network failure once', () => {
    expect(shouldRetryQuery(0, axiosErrorWithStatus(503))).toBe(true);
    expect(shouldRetryQuery(0, new AxiosError('Network Error'))).toBe(true);
    expect(shouldRetryQuery(1, axiosErrorWithStatus(503))).toBe(false);
  });
});
