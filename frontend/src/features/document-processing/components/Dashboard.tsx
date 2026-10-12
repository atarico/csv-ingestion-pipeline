'use client';

import { Button } from '@/shared/components/Button';
import { ErrorAlert } from '@/shared/components/ErrorAlert';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { getApiErrorMessage } from '@/shared/lib/api-client';
import { formatNumber } from '@/shared/lib/format';
import { useUploadStats } from '../api/uploadsApi';

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className={`rounded-card border border-line border-l-4 bg-surface p-5 shadow-card ${accent}`}>
      <p className="text-sm text-ink-muted">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums text-primary">{formatNumber(value)}</p>
    </div>
  );
}

export function Dashboard() {
  const { data, isPending, isError, error, refetch } = useUploadStats();

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight text-primary">Resumen</h1>
        <Button href="/uploads/new">Nuevo upload</Button>
      </div>

      {isPending ? <LoadingSpinner /> : null}
      {isError ? <ErrorAlert message={getApiErrorMessage(error)} onRetry={() => void refetch()} /> : null}
      {data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total de uploads" value={data.total} accent="border-l-primary" />
          <StatCard label="Completados" value={data.completed} accent="border-l-green-500" />
          <StatCard label="En proceso" value={data.pending + data.processing} accent="border-l-blue-500" />
          <StatCard label="Fallidos" value={data.failed} accent="border-l-red-500" />
        </div>
      ) : null}

      <div>
        <Button href="/uploads" variant="secondary">
          Ver todos los uploads
        </Button>
      </div>
    </section>
  );
}
