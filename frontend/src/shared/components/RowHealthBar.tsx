import { formatNumber } from '@/shared/lib/format';

interface RowHealthBarProps {
  /** Rows stored successfully. */
  valid: number;
  /** Rows rejected by validation. */
  invalid: number;
  className?: string;
}

function describe(valid: number, invalid: number): string {
  if (valid + invalid === 0) return 'Sin filas';
  const validText = `${formatNumber(valid)} ${valid === 1 ? 'fila válida' : 'filas válidas'}`;
  const invalidText = `${formatNumber(invalid)} ${invalid === 1 ? 'inválida' : 'inválidas'}`;
  return `${validText}, ${invalidText}`;
}

/** Thin bar splitting a file's rows into valid (accent) and invalid (danger). */
export function RowHealthBar({ valid, invalid, className = '' }: RowHealthBarProps) {
  const total = valid + invalid;
  const validShare = total > 0 ? (valid * 100) / total : 0;
  const invalidShare = total > 0 ? (invalid * 100) / total : 0;

  return (
    <div
      role="img"
      aria-label={describe(valid, invalid)}
      className={`flex h-1.5 overflow-hidden rounded-full bg-line ${className}`.trim()}
    >
      <div data-testid="row-health-valid" className="h-full bg-accent" style={{ width: `${validShare}%` }} />
      <div data-testid="row-health-invalid" className="h-full bg-danger" style={{ width: `${invalidShare}%` }} />
    </div>
  );
}
