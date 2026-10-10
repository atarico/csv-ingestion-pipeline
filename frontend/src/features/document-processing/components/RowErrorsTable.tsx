import type { RowErrorDto } from '../types/upload.types';

interface RowErrorsTableProps {
  errors: RowErrorDto[];
  failedRows: number;
}

export function RowErrorsTable({ errors, failedRows }: RowErrorsTableProps) {
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">Fila</th>
              <th scope="col" className="px-4 py-3 font-medium">Campo</th>
              <th scope="col" className="px-4 py-3 font-medium">Error</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {errors.map((error, index) => (
              <tr key={`${error.row}-${error.field ?? ''}-${index}`}>
                <td className="px-4 py-2 tabular-nums text-slate-600">{error.row}</td>
                <td className="px-4 py-2 text-slate-700">{error.field ?? '—'}</td>
                <td className="px-4 py-2 text-slate-900">{error.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {failedRows > errors.length ? (
        <p className="text-sm text-slate-600">
          Se muestran los primeros {errors.length} errores de {failedRows}.
        </p>
      ) : null}
    </div>
  );
}
