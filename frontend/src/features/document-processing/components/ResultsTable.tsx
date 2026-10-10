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
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Fila</th>
              <th scope="col" className="px-4 py-3 font-medium">Categoría</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Cantidad</th>
              <th scope="col" className="px-4 py-3 font-medium">Unidad</th>
              <th scope="col" className="px-4 py-3 font-medium">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-2 tabular-nums text-slate-600">{row.rowNumber}</td>
                <td className="px-4 py-2 text-slate-900">{row.category}</td>
                <td className="px-4 py-2 text-right tabular-nums text-slate-900">{formatNumber(row.amount)}</td>
                <td className="px-4 py-2 text-slate-700">{row.unit}</td>
                <td className="px-4 py-2 tabular-nums text-slate-700">{row.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  );
}
