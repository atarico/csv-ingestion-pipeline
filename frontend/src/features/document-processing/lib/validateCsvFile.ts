export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

/** Returns null when the file is acceptable, otherwise the Spanish message to show. */
export function validateCsvFile(file: File): string | null {
  if (!file.name.toLowerCase().endsWith('.csv')) return 'El archivo debe tener extensión .csv';
  if (file.size === 0) return 'El archivo está vacío';
  if (file.size > MAX_FILE_SIZE_BYTES) return 'El archivo supera el tamaño máximo de 5 MB';
  return null;
}
