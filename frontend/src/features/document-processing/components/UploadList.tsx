'use client';

import Link from 'next/link';
import { ErrorAlert } from '@/shared/components/ErrorAlert';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { Pagination } from '@/shared/components/Pagination';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { getApiErrorMessage } from '@/shared/lib/api-client';
import { formatDateTime } from '@/shared/lib/format';
import { useUploads } from '../api/uploadsApi';

export function UploadList({ page }: { page: number }) {
  const { data, isPending, isError, error, refetch } = useUploads(page);

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Uploads</h1>

      {isPending ? <LoadingSpinner /> : null}
      {isError ? <ErrorAlert message={getApiErrorMessage(error)} onRetry={() => void refetch()} /> : null}

      {data && data.data.length === 0 ? <p className="text-slate-600">Todavía no hay uploads.</p> : null}

      {data && data.data.length > 0 ? (
        <>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Nombre de archivo</th>
                  <th scope="col" className="px-4 py-3 font-medium">Estado</th>
                  <th scope="col" className="px-4 py-3 font-medium">Fecha de subida</th>
                  <th scope="col" className="px-4 py-3 font-medium">Filas procesadas</th>
                  <th scope="col" className="px-4 py-3 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.data.map((upload) => (
                  <tr key={upload.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{upload.fileName}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={upload.status} />
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-700">{formatDateTime(upload.createdAt)}</td>
                    <td className="px-4 py-3 tabular-nums text-slate-700">
                      {upload.processedRows !== null && upload.totalRows !== null
                        ? `${upload.processedRows}/${upload.totalRows}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/uploads/${upload.id}`}
                        className="rounded font-medium text-emerald-800 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                      >
                        Ver detalle
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} hrefFor={(target) => `/uploads?page=${target}`} />
        </>
      ) : null}
    </section>
  );
}
