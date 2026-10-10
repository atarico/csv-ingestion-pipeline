import { QueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

/** True for an HTTP 4xx answer: repeating the same request cannot change the outcome. */
export function isClientError(error: unknown): boolean {
  const status = isAxiosError(error) ? error.response?.status : undefined;
  return status !== undefined && status >= 400 && status < 500;
}

/** One retry for network and 5xx failures; a 4xx is never retried. */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  return !isClientError(error) && failureCount < 1;
}

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 1000, retry: shouldRetryQuery, refetchOnWindowFocus: false },
    },
  });
}
