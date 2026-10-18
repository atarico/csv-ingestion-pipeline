'use client';

import type { ReactNode } from 'react';
import { AnimatedNumber } from '@/shared/components/AnimatedNumber';
import { FileIcon } from '@/shared/components/icons';
import { RowHealthBar } from '@/shared/components/RowHealthBar';
import { formatDateTime, formatRelativeTime } from '@/shared/lib/format';
import { shareOf, TONE_STYLES, type OutcomeTone } from '../lib/outcomes';
import type { UploadDto } from '../types/upload.types';
import { ProcessingStatus } from './ProcessingStatus';

function Moment({ label, iso }: { label: string; iso: string }) {
  return (
    <span className="whitespace-nowrap">
      {label}{' '}
      <time dateTime={iso} title={formatDateTime(iso)} className="font-medium text-ink">
        {formatRelativeTime(iso)}
      </time>
    </span>
  );
}

interface StatTileProps {
  label: string;
  tone: OutcomeTone;
  value: number;
  suffix?: ReactNode;
  index: number;
}

function StatTile({ label, tone, value, suffix, index }: StatTileProps) {
  const styles = TONE_STYLES[tone];
  return (
    <div
      className={`rounded-xl p-4 motion-safe:animate-row-rise ${styles.chip}`}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <p className="text-xs font-medium uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-2 text-3xl font-semibold leading-none tabular-nums text-ink">
        <AnimatedNumber value={value} />
        {suffix}
      </p>
    </div>
  );
}

function CompletedStats({ upload }: { upload: UploadDto }) {
  const valid = upload.processedRows ?? 0;
  const invalid = upload.failedRows ?? 0;
  const total = upload.totalRows ?? valid + invalid;
  const validShare = shareOf(valid, total);
  const shareTone: OutcomeTone = invalid === 0 ? 'accent' : validShare >= 50 ? 'warning' : 'danger';

  return (
    <div className="space-y-4 border-t border-line pt-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Filas totales" tone="primary" value={total} index={0} />
        <StatTile label="Filas válidas" tone="accent" value={valid} index={1} />
        <StatTile label="Filas con errores" tone={invalid > 0 ? 'danger' : 'accent'} value={invalid} index={2} />
        <StatTile label="% válidas" tone={shareTone} value={validShare} suffix="%" index={3} />
      </div>
      <div className="space-y-2">
        <RowHealthBar valid={valid} invalid={invalid} className="h-2.5" />
        <p className="text-xs tabular-nums text-ink-muted">
          Filas procesadas: {valid} · Filas con errores: {invalid}
        </p>
      </div>
    </div>
  );
}

/** Header card of the detail page: identity, status, timestamps and, once finished, the row stats. */
export function UploadDetailSummary({ upload }: { upload: UploadDto }) {
  return (
    <div className="space-y-5 rounded-card border border-line bg-surface p-5 shadow-card motion-safe:animate-card-in sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <FileIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold tracking-tight text-ink" title={upload.fileName}>
              {upload.fileName}
            </h2>
            <p className="mt-0.5 flex flex-col gap-x-4 text-sm text-ink-muted sm:flex-row sm:flex-wrap">
              <Moment label="Subido" iso={upload.createdAt} />
              <Moment label="Actualizado" iso={upload.updatedAt} />
            </p>
          </div>
        </div>
        <div className="w-full sm:w-auto">
          <ProcessingStatus upload={upload} />
        </div>
      </div>
      {upload.status === 'COMPLETED' ? <CompletedStats upload={upload} /> : null}
    </div>
  );
}
