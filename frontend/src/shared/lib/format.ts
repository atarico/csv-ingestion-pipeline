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
