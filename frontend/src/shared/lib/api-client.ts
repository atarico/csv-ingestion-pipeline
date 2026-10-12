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

const SERVICE_UNAVAILABLE_MESSAGE = 'El servicio no está disponible. Vuelve a intentarlo en unos minutos.';

// The API speaks English; the UI explains in Spanish from the stable error code.
const MESSAGES_BY_CODE: Record<string, string> = {
  UNSUPPORTED_FILE: 'Solo se permiten archivos .csv',
  FILE_TOO_LARGE: 'El archivo supera el tamaño máximo de 5 MB',
  NOT_FOUND: 'Upload no encontrado',
  VALIDATION_ERROR: 'Solicitud inválida',
  STORAGE_ERROR: SERVICE_UNAVAILABLE_MESSAGE,
  MESSAGING_ERROR: SERVICE_UNAVAILABLE_MESSAGE,
};

/** Maps any thrown value to a Spanish, user-facing message. */
export function getApiErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const body: unknown = error.response?.data;
    if (isRecord(body) && isRecord(body.error) && typeof body.error.code === 'string') {
      return MESSAGES_BY_CODE[body.error.code] ?? UNEXPECTED_ERROR_MESSAGE;
    }
    if (!error.response) return NETWORK_ERROR_MESSAGE;
  }
  return UNEXPECTED_ERROR_MESSAGE;
}
