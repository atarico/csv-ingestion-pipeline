'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/shared/components/Button';
import { ErrorAlert } from '@/shared/components/ErrorAlert';
import { CheckCircleIcon, ChevronLeftIcon, XCircleIcon, XIcon } from '@/shared/components/icons';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { getApiErrorMessage } from '@/shared/lib/api-client';
import { describeUploadFailure } from '../lib/describeErrors';
import { JUST_UPLOADED_KEY, useUpload, useUploadResults } from '../api/uploadsApi';
import { ResultsTable } from './ResultsTable';
import type { RowErrorDto, UploadDto } from '../types/upload.types';
import { RowErrorsTable } from './RowErrorsTable';
import { UploadDetailSummary } from './UploadDetailSummary';
import { UploadDetailTabs, type DetailTab, type DetailTabKey } from './UploadDetailTabs';

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
          <ChevronLeftIcon className="h-4 w-4" />
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
          <UploadDetailSummary upload={upload} />

          {upload.status === 'COMPLETED' ? (
            <CompletedContent upload={upload} results={results} onPageChange={setPage} />
          ) : null}

          {upload.status === 'FAILED' ? (
            <>
              <FailureCallout upload={upload} />
              {upload.rowErrors.length > 0 ? (
                <ErrorsPanel errors={upload.rowErrors} failedRows={upload.failedRows ?? upload.rowErrors.length} />
              ) : null}
            </>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

function PanelHeading({ children }: { children: string }) {
  return <h2 className="text-lg font-semibold tracking-tight text-primary">{children}</h2>;
}

function ErrorsPanel({ errors, failedRows }: { errors: RowErrorDto[]; failedRows: number }) {
  return (
    <div className="space-y-3">
      <PanelHeading>Filas con errores</PanelHeading>
      <RowErrorsTable errors={errors} failedRows={failedRows} />
    </div>
  );
}

interface CompletedContentProps {
  upload: UploadDto;
  results: ReturnType<typeof useUploadResults>;
  onPageChange: (page: number) => void;
}

function CompletedContent({ upload, results, onPageChange }: CompletedContentProps) {
  const failedRows = upload.failedRows ?? 0;
  const hasErrors = failedRows > 0;
  const [chosen, setChosen] = useState<DetailTabKey | null>(null);
  // Errors are the actionable content, so they open first; the user's pick wins afterwards.
  const selected: DetailTabKey = hasErrors ? (chosen ?? 'errors') : 'data';

  const dataPanel = (
    <div className="space-y-3">
      <PanelHeading>Datos procesados</PanelHeading>
      {results.isPending ? <LoadingSpinner /> : null}
      {results.isError ? <ErrorAlert message={getApiErrorMessage(results.error)} onRetry={() => void results.refetch()} /> : null}
      {results.data ? (
        <ResultsTable
          rows={results.data.data}
          page={results.data.page}
          totalPages={results.data.totalPages}
          onPageChange={onPageChange}
        />
      ) : null}
    </div>
  );

  if (!hasErrors) return dataPanel;

  const tabs: DetailTab[] = [
    { key: 'data', label: 'Datos procesados', count: upload.processedRows ?? 0, tone: 'accent' },
    { key: 'errors', label: 'Filas con errores', count: failedRows, tone: 'danger' },
  ];

  return (
    <UploadDetailTabs tabs={tabs} selected={selected} onSelect={setChosen}>
      {selected === 'errors' ? <ErrorsPanel errors={upload.rowErrors} failedRows={failedRows} /> : dataPanel}
    </UploadDetailTabs>
  );
}

function FailureCallout({ upload }: { upload: UploadDto }) {
  const { title, where, lines, fix, sampleLink } = describeUploadFailure(upload);
  return (
    <div
      role="alert"
      className="flex gap-4 rounded-card border border-danger/30 border-l-4 border-l-danger bg-danger-soft p-5 text-danger shadow-card motion-safe:animate-card-in"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface/70">
        <XCircleIcon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-lg font-semibold leading-snug">{title}</p>
        {where ? <p className="text-sm font-medium">Dónde: {where}</p> : null}
        {lines.length > 0 ? (
          <ul className="list-inside list-disc text-sm">
            {lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : null}
        {fix ? <p className="text-sm">{fix}</p> : null}
        {sampleLink ? (
          <a
            href="/ejemplo.csv"
            download
            className="inline-block rounded-full border border-danger/40 bg-surface/70 px-4 py-1.5 text-sm font-semibold underline-offset-2 transition-colors duration-150 hover:bg-surface focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-accent/40 motion-reduce:transition-none"
          >
            Descargar un CSV de ejemplo
          </a>
        ) : null}
      </div>
    </div>
  );
}
