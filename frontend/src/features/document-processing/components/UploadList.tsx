'use client';

import { Button } from '@/shared/components/Button';
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
      <h1 className="text-3xl font-bold tracking-tight text-primary">Uploads</h1>

      {isPending ? <LoadingSpinner /> : null}
      {isError ? <ErrorAlert message={getApiErrorMessage(error)} onRetry={() => void refetch()} /> : null}

      {data && data.data.length === 0 && data.total === 0 ? (
        <p className="text-ink-muted">Todavía no hay uploads.</p>
      ) : null}

      {data && data.data.length === 0 && data.total > 0 ? (
        <div className="space-y-2">
          <p className="text-ink-muted">No hay uploads en esta página.</p>
          <Button href="/uploads?page=1" variant="secondary">
            Volver a la primera página
          </Button>
        </div>
      ) : null}

      {data && data.data.length > 0 ? (
        <>
          <div className="overflow-x-auto rounded-card border border-line bg-surface shadow-card">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-bg text-xs uppercase tracking-wide text-ink-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Nombre de archivo</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Estado</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Fecha de subida</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Filas procesadas</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((upload) => (
                  <tr className="border-t border-line transition-colors duration-150 hover:bg-primary-soft/40 motion-reduce:transition-none" key={upload.id}>
                    <td className="px-4 py-3 font-semibold text-ink">{upload.fileName}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={upload.status} />
                    </td>
                    <td className="px-4 py-3 tabular-nums text-ink-muted">{formatDateTime(upload.createdAt)}</td>
                    <td className="px-4 py-3 tabular-nums text-ink-muted">
                      {upload.processedRows !== null && upload.totalRows !== null
                        ? `${upload.processedRows}/${upload.totalRows}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/uploads/${upload.id}`}
                        className="rounded font-semibold text-primary underline underline-offset-4 hover:text-primary-hover focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-accent/40"
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
