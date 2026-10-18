'use client';

import Link from 'next/link';
import { Button } from '@/shared/components/Button';
import { ErrorAlert } from '@/shared/components/ErrorAlert';
import { ChevronRightIcon, FileIcon, InboxIcon, UploadIcon } from '@/shared/components/icons';
import { Pagination } from '@/shared/components/Pagination';
import { RowHealthBar } from '@/shared/components/RowHealthBar';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { getApiErrorMessage } from '@/shared/lib/api-client';
import { formatDateTime, formatNumber, formatRelativeTime } from '@/shared/lib/format';
import { useUploads, useUploadStats } from '../api/uploadsApi';
import { getOutcome, uploadsListHref, type OutcomeKey } from '../lib/outcomes';
import type { UploadSummaryDto } from '../types/upload.types';
import { OutcomeFilterChips } from './OutcomeFilterChips';

const SKELETON_ROWS = 6;
const STAGGER_MS = 30;

const TH = 'px-4 py-3 font-semibold';

function rowsText(upload: UploadSummaryDto): string | null {
  return upload.processedRows !== null && upload.totalRows !== null ? `${upload.processedRows}/${upload.totalRows}` : null;
}

function SkeletonRows() {
  return (
    <ul aria-hidden="true" className="divide-y divide-line">
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <li key={index} data-testid="upload-skeleton" className="flex items-center gap-3 px-4 py-4">
          <div className="skeleton h-5 w-5 motion-safe:animate-shimmer" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="skeleton h-3.5 w-1/2 motion-safe:animate-shimmer" />
            <div className="skeleton h-2.5 w-1/3 motion-safe:animate-shimmer" />
          </div>
          <div className="skeleton h-3 w-16 motion-safe:animate-shimmer" />
        </li>
      ))}
    </ul>
  );
}

function UploadRow({ upload, index }: { upload: UploadSummaryDto; index: number }) {
  const valid = upload.processedRows ?? 0;
  const invalid = upload.failedRows ?? 0;
  const counter = rowsText(upload);
  const relative = formatRelativeTime(upload.createdAt);

  return (
    <tr
      className="group relative border-t border-line transition-colors duration-150 ease-brand hover:bg-primary-soft/50 focus-within:bg-primary-soft/50 motion-reduce:transition-none motion-safe:animate-row-rise"
      style={{ animationDelay: `${index * STAGGER_MS}ms` }}
    >
      <td className="w-full max-w-0 px-4 py-3.5">
        <div className="flex items-center gap-3">
          <FileIcon className="h-5 w-5 shrink-0 text-ink-subtle" />
          <div className="min-w-0">
            <span className="block truncate font-medium text-ink" title={upload.fileName}>
              {upload.fileName}
            </span>
            <span className="mt-1 flex items-center gap-x-2 whitespace-nowrap text-xs text-ink-muted sm:hidden">
              <StatusBadge status={upload.status} />
              <span>{relative}</span>
              {upload.totalRows !== null ? <span className="tabular-nums">· {formatNumber(upload.totalRows)} filas</span> : null}
            </span>
          </div>
        </div>
      </td>
      <td className="hidden w-px whitespace-nowrap px-4 py-3.5 sm:table-cell">
        <StatusBadge status={upload.status} />
      </td>
      <td className="hidden w-px whitespace-nowrap px-4 py-3.5 text-ink-muted sm:table-cell">
        <time dateTime={upload.createdAt} title={formatDateTime(upload.createdAt)}>
          {relative}
        </time>
      </td>
      <td className="hidden w-px whitespace-nowrap px-4 py-3.5 md:table-cell">
        {counter ? (
          <div className="flex items-center gap-3">
            <span className="tabular-nums text-ink-muted">{counter}</span>
            {valid + invalid > 0 ? <RowHealthBar valid={valid} invalid={invalid} className="w-20" /> : null}
          </div>
        ) : (
          <span className="text-ink-muted">—</span>
        )}
      </td>
      <td className="w-px px-4 py-3.5 text-right">
        <Link
          href={`/uploads/${upload.id}`}
          aria-label="Ver detalle"
          className="inline-flex rounded-full p-1 text-ink-subtle transition-colors duration-150 group-hover:text-primary after:absolute after:inset-0 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-accent/40"
        >
          <ChevronRightIcon className="h-5 w-5 transition-transform duration-150 ease-brand group-hover:translate-x-0.5 motion-reduce:transition-none" />
        </Link>
      </td>
    </tr>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-14 text-center text-ink-muted">
      <InboxIcon className="h-9 w-9 text-ink-subtle" />
      <p>{message}</p>
    </div>
  );
}

export function UploadList({ page, outcome = 'all' }: { page: number; outcome?: OutcomeKey }) {
  const { data, isPending, isError, error, refetch } = useUploads(page, outcome);
  const { data: stats } = useUploadStats();
  const definition = getOutcome(outcome);

  const isEmpty = data !== undefined && data.data.length === 0 && data.total === 0;
  const isPastEnd = data !== undefined && data.data.length === 0 && data.total > 0;

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Uploads</h1>
          <p className="mt-1 text-sm text-ink-muted">Historial de cargas y el resultado de cada una.</p>
        </div>
        <Button href="/uploads/new">
          <UploadIcon className="h-4 w-4" />
          Nuevo upload
        </Button>
      </header>

      <OutcomeFilterChips selected={outcome} stats={stats} />

      {isError ? <ErrorAlert message={getApiErrorMessage(error)} onRetry={() => void refetch()} /> : null}

      <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card" aria-busy={isPending}>
        {isPending ? <SkeletonRows /> : null}
        {isEmpty ? <EmptyState message={definition.emptyMessage} /> : null}
        {isPastEnd ? (
          <div className="flex flex-col items-center gap-3 px-4 py-12 text-center text-ink-muted">
            <p>No hay uploads en esta página.</p>
            <Button href={uploadsListHref(outcome)} variant="secondary">
              Volver a la primera página
            </Button>
          </div>
        ) : null}

        {data && data.data.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead className="bg-bg text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th scope="col" className={TH}>Nombre de archivo</th>
                <th scope="col" className={`${TH} hidden w-px sm:table-cell`}>Estado</th>
                <th scope="col" className={`${TH} hidden whitespace-nowrap sm:table-cell`}>Fecha de subida</th>
                <th scope="col" className={`${TH} hidden whitespace-nowrap md:table-cell`}>Filas procesadas</th>
                <th scope="col" className={TH}>
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody key={`${outcome}-${data.page}`}>
              {data.data.map((upload, index) => (
                <UploadRow key={upload.id} upload={upload} index={index} />
              ))}
            </tbody>
          </table>
        ) : null}
      </div>

      {data && data.data.length > 0 ? (
        <Pagination page={data.page} totalPages={data.totalPages} hrefFor={(target) => uploadsListHref(outcome, target)} />
      ) : null}
    </section>
  );
}
