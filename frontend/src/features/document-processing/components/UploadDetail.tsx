'use client';

import { useState } from 'react';
import { Button } from '@/shared/components/Button';
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
        <h1 className="text-3xl font-bold tracking-tight text-primary">Detalle del upload</h1>
        <Button href="/uploads" variant="secondary">
          Volver a la lista
        </Button>
      </div>

      {isPending ? <LoadingSpinner /> : null}
      {isError ? <ErrorAlert message={getApiErrorMessage(error)} onRetry={() => void refetch()} /> : null}

      {upload ? (
        <>
          <dl className="grid gap-4 rounded-card border border-line bg-surface p-5 shadow-card sm:grid-cols-2">
            <div>
              <dt className="text-sm text-ink-muted">Archivo</dt>
              <dd className="break-all font-medium text-ink">{upload.fileName}</dd>
            </div>
            <div>
              <dt className="text-sm text-ink-muted">Estado</dt>
              <dd className="mt-0.5">
                <ProcessingStatus upload={upload} />
              </dd>
            </div>
            <div>
              <dt className="text-sm text-ink-muted">Fecha de subida</dt>
              <dd className="tabular-nums text-ink">{formatDateTime(upload.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-sm text-ink-muted">Última actualización</dt>
              <dd className="tabular-nums text-ink">{formatDateTime(upload.updatedAt)}</dd>
            </div>
          </dl>

          {upload.status === 'COMPLETED' ? (
            <>
              <p className="text-ink">
                Filas procesadas: {upload.processedRows ?? 0} · Filas con errores: {upload.failedRows ?? 0}
              </p>

              <div className="space-y-3">
                <h2 className="text-xl font-bold tracking-tight text-primary">Datos procesados</h2>
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
                  <h2 className="text-xl font-bold tracking-tight text-primary">Filas con errores</h2>
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
                  <h2 className="text-xl font-bold tracking-tight text-primary">Filas con errores</h2>
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
