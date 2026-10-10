'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ErrorAlert } from '@/shared/components/ErrorAlert';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { getApiErrorMessage } from '@/shared/lib/api-client';
import { formatDateTime } from '@/shared/lib/format';
import { useUpload, useUploadResults } from '../api/uploadsApi';
import { ProcessingStatus } from './ProcessingStatus';
import { ResultsTable } from './ResultsTable';
import { RowErrorsTable } from './RowErrorsTable';

export function UploadDetail({ id }: { id: string }) {
  const [page, setPage] = useState(1);
  const { data: upload, isPending, isError, error, refetch } = useUpload(id);
  const results = useUploadResults(id, page, upload?.status === 'COMPLETED');

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Detalle del upload</h1>
        <Link
          href="/uploads"
          className="rounded text-sm font-medium text-emerald-800 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
        >
          Volver a la lista
        </Link>
      </div>

      {isPending ? <LoadingSpinner /> : null}
      {isError ? <ErrorAlert message={getApiErrorMessage(error)} onRetry={() => void refetch()} /> : null}

      {upload ? (
        <>
          <dl className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-slate-600">Archivo</dt>
              <dd className="break-all font-medium text-slate-900">{upload.fileName}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-600">Estado</dt>
              <dd className="mt-0.5">
                <ProcessingStatus upload={upload} />
              </dd>
            </div>
            <div>
              <dt className="text-sm text-slate-600">Fecha de subida</dt>
              <dd className="tabular-nums text-slate-900">{formatDateTime(upload.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-600">Última actualización</dt>
              <dd className="tabular-nums text-slate-900">{formatDateTime(upload.updatedAt)}</dd>
            </div>
          </dl>

          {upload.status === 'COMPLETED' ? (
            <>
              <p className="text-slate-800">
                Filas procesadas: {upload.processedRows ?? 0} · Filas con errores: {upload.failedRows ?? 0}
              </p>

              <div className="space-y-3">
                <h2 className="text-lg font-semibold text-slate-900">Datos procesados</h2>
                {results.isPending ? <LoadingSpinner /> : null}
                {results.isError ? (
                  <ErrorAlert message={getApiErrorMessage(results.error)} onRetry={() => void results.refetch()} />
                ) : null}
                {results.data ? (
                  <ResultsTable
                    rows={results.data.data}
                    page={results.data.page}
                    totalPages={results.data.totalPages}
                    onPageChange={setPage}
                  />
                ) : null}
              </div>

              {(upload.failedRows ?? 0) > 0 ? (
                <div className="space-y-3">
                  <h2 className="text-lg font-semibold text-slate-900">Filas con errores</h2>
                  <RowErrorsTable errors={upload.rowErrors} failedRows={upload.failedRows ?? 0} />
                </div>
              ) : null}
            </>
          ) : null}

          {upload.status === 'FAILED' ? (
            <>
              <ErrorAlert
                title="El procesamiento falló"
                message={upload.errorMessage ?? 'Ocurrió un error inesperado'}
              />
              {upload.rowErrors.length > 0 ? (
                <div className="space-y-3">
                  <h2 className="text-lg font-semibold text-slate-900">Filas con errores</h2>
                  <RowErrorsTable errors={upload.rowErrors} failedRows={upload.failedRows ?? upload.rowErrors.length} />
                </div>
              ) : null}
            </>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
