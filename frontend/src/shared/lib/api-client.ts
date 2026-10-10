import axios, { isAxiosError } from 'axios';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1',
  timeout: 30_000,
});

const NETWORK_ERROR_MESSAGE = 'No se pudo conectar con el servidor';
const UNEXPECTED_ERROR_MESSAGE = 'Ocurrió un error inesperado';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Extracts the first human-readable message from the `details` field of an API error. */
function firstDetailMessage(details: unknown): string | null {
  const entries = Array.isArray(details) ? details : isRecord(details) ? Object.values(details) : [];
  for (const entry of entries) {
    if (isRecord(entry) && typeof entry.message === 'string') return entry.message;
    if (typeof entry === 'string') return entry;
  }
  return null;
}

/** Maps any thrown value to a Spanish, user-facing message. */
export function getApiErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const body: unknown = error.response?.data;
    if (isRecord(body) && isRecord(body.error) && typeof body.error.message === 'string') {
      const detail = firstDetailMessage(body.error.details);
      return detail ? `${body.error.message}: ${detail}` : body.error.message;
    }
    if (!error.response) return NETWORK_ERROR_MESSAGE;
  }
  return UNEXPECTED_ERROR_MESSAGE;
}
