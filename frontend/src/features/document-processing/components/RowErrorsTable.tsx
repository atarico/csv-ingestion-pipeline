import type { RowErrorDto } from '../types/upload.types';

interface RowErrorsTableProps {
  errors: RowErrorDto[];
  failedRows: number;
}

export function RowErrorsTable({ errors, failedRows }: RowErrorsTableProps) {
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-card border border-line bg-surface shadow-card">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-bg text-xs uppercase tracking-wide text-ink-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">Fila</th>
              <th scope="col" className="px-4 py-3 font-semibold">Campo</th>
              <th scope="col" className="px-4 py-3 font-semibold">Error</th>
            </tr>
          </thead>
          <tbody>
            {errors.map((error, index) => (
              <tr className="border-t border-line transition-colors duration-150 hover:bg-primary-soft/40 motion-reduce:transition-none" key={`${error.row}-${error.field ?? ''}-${index}`}>
                <td className="px-4 py-2 tabular-nums text-ink-muted">{error.row}</td>
                <td className="px-4 py-2 text-ink-muted">{error.field ?? '—'}</td>
                <td className="px-4 py-2 text-ink">{error.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {failedRows > errors.length ? (
        <p className="text-sm text-ink-muted">
          Se muestran los primeros {errors.length} errores de {failedRows}.
        </p>
      ) : null}
    </div>
  );
}
