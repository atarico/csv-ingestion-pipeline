function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Deterministic "dd/MM/yyyy HH:mm" from the Date's local getters (no Intl, stable across runtimes). */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const numberFormat = new Intl.NumberFormat('es', { maximumFractionDigits: 4 });

export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

const sizeFormat = new Intl.NumberFormat('es', { maximumFractionDigits: 1 });
const SIZE_UNITS = ['B', 'KB', 'MB', 'GB'];

/** Human file size with the 1024 base and one decimal at most ("12,3 KB"). */
export function formatBytes(bytes: number): string {
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < SIZE_UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${sizeFormat.format(value)} ${SIZE_UNITS[unit]}`;
}
