import Link from 'next/link';
import { ErrorAlert } from '@/shared/components/ErrorAlert';
import { ChevronRightIcon, InboxIcon } from '@/shared/components/icons';
import { RowHealthBar } from '@/shared/components/RowHealthBar';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { formatDateTime, formatNumber, formatRelativeTime } from '@/shared/lib/format';
import { OUTCOME_PANEL_ID, TONE_STYLES, outcomeTabId, uploadsListHref, type OutcomeDefinition } from '../lib/outcomes';
import type { UploadSummaryDto } from '../types/upload.types';

const SKELETON_ROWS = 5;
const STAGGER_MS = 30;

interface RecentUploadsPanelProps {
  outcome: OutcomeDefinition;
  /** `undefined` while nothing has been fetched for this outcome. */
  uploads: UploadSummaryDto[] | undefined;
  isLoading: boolean;
  errorMessage?: string;
  onRetry: () => void;
}

function SkeletonRows() {
  return (
    <ul aria-hidden="true" className="divide-y divide-line">
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <li key={index} data-testid="upload-skeleton" className="flex items-center gap-3 px-4 py-3.5">
          <div className="skeleton h-2.5 w-2.5 rounded-full motion-safe:animate-shimmer" />
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

function UploadRow({ upload, outcome, index }: { upload: UploadSummaryDto; outcome: OutcomeDefinition; index: number }) {
  const valid = upload.processedRows ?? 0;
  const invalid = upload.failedRows ?? 0;
  const hasRows = valid + invalid > 0;

  return (
    <li className="motion-safe:animate-row-rise" style={{ animationDelay: `${index * STAGGER_MS}ms` }}>
      <Link
        href={`/uploads/${upload.id}`}
        className="group flex items-center gap-3 px-4 py-3 transition-colors duration-150 ease-brand hover:bg-primary-soft focus-visible:bg-primary-soft focus-visible:outline-none"
      >
        {outcome.key === 'all' ? (
          <StatusBadge status={upload.status} />
        ) : (
          <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${TONE_STYLES[outcome.tone].dot}`} />
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-ink" title={upload.fileName}>
            {upload.fileName}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
            {upload.totalRows !== null ? <span>{formatNumber(upload.totalRows)} filas</span> : null}
            {invalid > 0 ? <span>{formatNumber(invalid)} inválidas</span> : null}
            {hasRows ? <RowHealthBar valid={valid} invalid={invalid} className="w-24" /> : null}
          </span>
        </span>
        <time dateTime={upload.createdAt} title={formatDateTime(upload.createdAt)} className="shrink-0 text-xs text-ink-subtle">
          {formatRelativeTime(upload.createdAt)}
        </time>
        <ChevronRightIcon className="h-4 w-4 shrink-0 text-ink-subtle transition-transform duration-150 ease-brand group-hover:translate-x-0.5 motion-reduce:transition-none" />
      </Link>
    </li>
  );
}

/** Latest uploads of the selected outcome; the tabpanel that the outcome cards control. */
export function RecentUploadsPanel({ outcome, uploads, isLoading, errorMessage, onRetry }: RecentUploadsPanelProps) {
  const heading = `Últimos 10 · ${outcome.label}`;
  const showError = errorMessage !== undefined && uploads === undefined;

  return (
    <div
      role="tabpanel"
      id={OUTCOME_PANEL_ID}
      aria-labelledby={outcomeTabId(outcome.key)}
      aria-busy={isLoading}
      className="overflow-hidden rounded-card border border-line bg-surface shadow-card"
    >
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${TONE_STYLES[outcome.tone].dot}`} />
          {heading}
        </h2>
        <Link href={uploadsListHref(outcome.key)} className="text-sm font-medium text-primary hover:underline">
          Ver todos
        </Link>
      </div>

      {showError ? (
        <div className="p-4">
          <ErrorAlert message={errorMessage} onRetry={onRetry} />
        </div>
      ) : isLoading || uploads === undefined ? (
        <SkeletonRows />
      ) : uploads.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-ink-muted">
          <InboxIcon className="h-8 w-8 text-ink-subtle" />
          <p>{outcome.emptyMessage}</p>
        </div>
      ) : (
        <ul key={outcome.key} className="divide-y divide-line">
          {uploads.map((upload, index) => (
            <UploadRow key={upload.id} upload={upload} outcome={outcome} index={index} />
          ))}
        </ul>
      )}
    </div>
  );
}
