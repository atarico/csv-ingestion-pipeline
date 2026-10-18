function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Deterministic "dd/MM/yyyy HH:mm" from the Date's local getters (no Intl, stable across runtimes). */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// 'always' groups 4-digit numbers too (locale 'es' otherwise writes 9000 but 10.000).
const numberFormat = new Intl.NumberFormat('es', { maximumFractionDigits: 4, useGrouping: 'always' });

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

const relativeFormat = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });

const RELATIVE_UNITS: Array<{ unit: Intl.RelativeTimeFormatUnit; seconds: number }> = [
  { unit: 'year', seconds: 365 * 24 * 3600 },
  { unit: 'month', seconds: 30 * 24 * 3600 },
  { unit: 'day', seconds: 24 * 3600 },
  { unit: 'hour', seconds: 3600 },
  { unit: 'minute', seconds: 60 },
];

/** Spanish relative time ("hace 5 minutos", "ayer"). Anything under a minute, or in the future, is "ahora". */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const elapsedSeconds = Math.floor((now.getTime() - new Date(iso).getTime()) / 1000);
  for (const { unit, seconds } of RELATIVE_UNITS) {
    if (elapsedSeconds >= seconds) return relativeFormat.format(-Math.floor(elapsedSeconds / seconds), unit);
  }
  return relativeFormat.format(0, 'second');
}
