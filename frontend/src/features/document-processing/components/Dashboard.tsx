'use client';

import { useState } from 'react';
import { Button } from '@/shared/components/Button';
import { ErrorAlert } from '@/shared/components/ErrorAlert';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { getApiErrorMessage } from '@/shared/lib/api-client';
import { formatNumber } from '@/shared/lib/format';
import { useRecentUploads, useUploadStats } from '../api/uploadsApi';
import { getOutcome, type OutcomeKey } from '../lib/outcomes';
import { OutcomeDistributionBar } from './OutcomeDistributionBar';
import { OutcomeTabs } from './OutcomeTabs';
import { RecentUploadsPanel } from './RecentUploadsPanel';

/** Pulsing pill when uploads are being processed, muted when idle. */
function LiveIndicator({ inProgress }: { inProgress: number }) {
  const active = inProgress > 0;
  return (
    <p
      role="status"
      className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm text-white ring-1 ring-white/15"
    >
      <span aria-hidden="true" className="relative flex h-2.5 w-2.5">
        {active ? (
          <span className="absolute inline-flex h-full w-full rounded-full bg-accent-light opacity-60 motion-safe:animate-ping" />
        ) : null}
        <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${active ? 'bg-accent-light' : 'bg-white/40'}`} />
      </span>
      {active ? `${formatNumber(inProgress)} en proceso` : 'Sin procesos activos'}
    </p>
  );
}

export function Dashboard() {
  const stats = useUploadStats();
  const [selected, setSelected] = useState<OutcomeKey>('all');
  const recent = useRecentUploads(selected);
  const outcome = getOutcome(selected);

  return (
    <section>
      <div className="relative overflow-hidden rounded-card bg-surface-dark px-5 dark:ring-1 dark:ring-line pb-16 pt-6 text-white sm:px-8 sm:pt-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:radial-gradient(var(--color-white)_1px,transparent_1px)] [background-size:20px_20px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full opacity-25 [background-image:radial-gradient(circle,var(--color-accent-light),transparent_68%)]"
        />
        <div className="relative space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Resumen</h1>
              <p className="mt-1 text-sm text-white/70">Estado de tus cargas de datos de actividad.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {stats.data ? <LiveIndicator inProgress={stats.data.pending + stats.data.processing} /> : null}
              <Button href="/uploads/new">Nuevo upload</Button>
            </div>
          </div>
          {stats.data ? (
            <OutcomeDistributionBar stats={stats.data} />
          ) : (
            <div aria-hidden="true" className="skeleton h-2.5 w-full opacity-20 motion-safe:animate-shimmer" />
          )}
        </div>
      </div>

      {stats.isPending ? <LoadingSpinner /> : null}
      {stats.isError ? (
        <div className="mt-6">
          <ErrorAlert message={getApiErrorMessage(stats.error)} onRetry={() => void stats.refetch()} />
        </div>
      ) : null}

      {stats.data ? (
        <>
          <OutcomeTabs stats={stats.data} selected={selected} onSelect={setSelected} />
          <div className="mt-6">
            <RecentUploadsPanel
              outcome={outcome}
              uploads={recent.data?.data}
              isLoading={recent.isPending}
              errorMessage={recent.isError ? getApiErrorMessage(recent.error) : undefined}
              onRetry={() => void recent.refetch()}
            />
          </div>
        </>
      ) : null}
    </section>
  );
}
