import { Pagination } from '@/shared/components/Pagination';
import { formatNumber } from '@/shared/lib/format';
import type { ActivityDataDto } from '../types/upload.types';

interface ResultsTableProps {
  rows: ActivityDataDto[];
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function ResultsTable({ rows, page, totalPages, onPageChange }: ResultsTableProps) {
  return (
    <div>
      <div className="overflow-x-auto rounded-card border border-line bg-surface shadow-card">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-bg text-xs uppercase tracking-wide text-ink-muted">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">Fila</th>
              <th scope="col" className="px-4 py-3 font-semibold">Categoría</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Cantidad</th>
              <th scope="col" className="px-4 py-3 font-semibold">Unidad</th>
              <th scope="col" className="px-4 py-3 font-semibold">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="border-t border-line transition-colors duration-150 hover:bg-primary-soft/40 motion-reduce:transition-none" key={row.id}>
                <td className="px-4 py-2 tabular-nums text-ink-muted">{row.rowNumber}</td>
                <td className="px-4 py-2 text-ink">{row.category}</td>
                <td className="px-4 py-2 text-right tabular-nums text-ink">{formatNumber(row.amount)}</td>
                <td className="px-4 py-2 text-ink-muted">{row.unit}</td>
                <td className="px-4 py-2 tabular-nums text-ink-muted">{row.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  );
}
