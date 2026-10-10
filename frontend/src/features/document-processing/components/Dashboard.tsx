'use client';

import Link from 'next/link';
import { ErrorAlert } from '@/shared/components/ErrorAlert';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { getApiErrorMessage } from '@/shared/lib/api-client';
import { formatNumber } from '@/shared/lib/format';
import { useUploadStats } from '../api/uploadsApi';

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className={`rounded-lg border border-slate-200 border-l-4 bg-white p-5 ${accent}`}>
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums text-slate-900">{formatNumber(value)}</p>
    </div>
  );
}

export function Dashboard() {
  const { data, isPending, isError, error, refetch } = useUploadStats();

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Resumen</h1>
        <Link
          href="/uploads/new"
          className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
        >
          Nuevo upload
        </Link>
      </div>

      {isPending ? <LoadingSpinner /> : null}
      {isError ? <ErrorAlert message={getApiErrorMessage(error)} onRetry={() => void refetch()} /> : null}
      {data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total de uploads" value={data.total} accent="border-l-slate-400" />
          <StatCard label="Completados" value={data.completed} accent="border-l-green-500" />
          <StatCard label="En proceso" value={data.pending + data.processing} accent="border-l-blue-500" />
          <StatCard label="Fallidos" value={data.failed} accent="border-l-red-500" />
        </div>
      ) : null}

      <Link
        href="/uploads"
        className="inline-block rounded text-sm font-medium text-emerald-800 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
      >
        Ver todos los uploads
      </Link>
    </section>
  );
}
