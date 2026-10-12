'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/shared/components/Button';
import { ErrorAlert } from '@/shared/components/ErrorAlert';
import { CheckCircleIcon, XIcon } from '@/shared/components/icons';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { getApiErrorMessage } from '@/shared/lib/api-client';
import { formatDateTime } from '@/shared/lib/format';
import { describeUploadFailure } from '../lib/describeErrors';
import { JUST_UPLOADED_KEY, useUpload, useUploadResults } from '../api/uploadsApi';
import { ProcessingStatus } from './ProcessingStatus';
import { ResultsTable } from './ResultsTable';
import type { UploadDto } from '../types/upload.types';
import { RowErrorsTable } from './RowErrorsTable';

export function UploadDetail({ id }: { id: string }) {
  const [page, setPage] = useState(1);
  const { data: upload, isPending, isError, error, refetch } = useUpload(id);
  const results = useUploadResults(id, page, upload?.status === 'COMPLETED');
  const [showBanner, setShowBanner] = useState(false);

  // Read in an effect (the component is SSR-rendered); only ever sets true, as StrictMode runs effects twice.
  useEffect(() => {
    try {
      if (sessionStorage.getItem(JUST_UPLOADED_KEY) === id) {
        sessionStorage.removeItem(JUST_UPLOADED_KEY);
        // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage only exists after hydration
        setShowBanner(true);
      }
    } catch {
      // Storage unavailable: no banner.
    }
  }, [id]);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Detalle del upload</h1>
        <Button href="/uploads" variant="secondary">
          Volver a la lista
        </Button>
      </div>

      {showBanner ? (
        <div
          role="status"
          className="flex animate-card-in items-start gap-3 rounded-card border border-accent/30 bg-accent-soft p-4 text-accent motion-reduce:animate-none"
        >
          <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="flex-1 text-sm font-medium">
            El archivo se subió correctamente. El procesamiento empieza en segundos y esta página se actualiza sola.
          </p>
          <button
            type="button"
            aria-label="Cerrar aviso"
            onClick={() => setShowBanner(false)}
            className="rounded-full p-1 transition-colors duration-150 hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-accent/40 motion-reduce:transition-none"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
      ) : null}

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
              <FailureAlert upload={upload} />
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

function FailureAlert({ upload }: { upload: UploadDto }) {
  const { title, where, lines, fix, sampleLink } = describeUploadFailure(upload);
  return (
    <ErrorAlert title={title}>
      <div className="mt-1 space-y-2 text-sm">
        {where ? <p className="font-medium">Dónde: {where}</p> : null}
        {lines.length > 0 ? (
          <ul className="list-inside list-disc">
            {lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : null}
        {fix ? <p>{fix}</p> : null}
        {sampleLink ? (
          <a href="/ejemplo.csv" download className="inline-block font-semibold underline underline-offset-2">
            Descargar un CSV de ejemplo
          </a>
        ) : null}
      </div>
    </ErrorAlert>
  );
}
