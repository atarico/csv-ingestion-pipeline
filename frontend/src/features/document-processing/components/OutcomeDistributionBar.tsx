import { formatNumber } from '@/shared/lib/format';
import { TONE_STYLES, distributionOf, shareOf, type OutcomeTone } from '../lib/outcomes';
import type { UploadStatsDto } from '../types/upload.types';

const SEGMENTS = [
  { key: 'correct', label: 'Correctos', tone: 'accent' },
  { key: 'withProblems', label: 'Con problemas', tone: 'warning' },
  { key: 'failed', label: 'Fallidos', tone: 'danger' },
] as const satisfies ReadonlyArray<{ key: string; label: string; tone: OutcomeTone }>;

/** Share of finished uploads (completed + failed) by outcome, as a segmented bar with a legend. */
export function OutcomeDistributionBar({ stats }: { stats: UploadStatsDto }) {
  const distribution = distributionOf(stats);

  if (distribution.total === 0) {
    return <p className="text-sm text-white/60">Aún no hay cargas finalizadas.</p>;
  }

  const summary = `Distribución de resultados: ${formatNumber(distribution.correct)} correctos, ${formatNumber(distribution.withProblems)} con problemas, ${formatNumber(distribution.failed)} fallidos`;

  return (
    <div className="space-y-3">
      <div role="img" aria-label={summary} className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-white/10">
        {SEGMENTS.map(({ key, tone }) => (
          <div
            key={key}
            className={`h-full transition-[width] duration-300 ease-brand motion-reduce:transition-none ${TONE_STYLES[tone].bar}`}
            style={{ width: `${(distribution[key] * 100) / distribution.total}%` }}
          />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-white/80">
        {SEGMENTS.map(({ key, label, tone }) => (
          <li key={key} className="flex items-center gap-2">
            <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${TONE_STYLES[tone].dot}`} />
            <span>{label}</span>
            <span className="font-semibold tabular-nums text-white">{formatNumber(distribution[key])}</span>
            <span className="tabular-nums text-white/60">{shareOf(distribution[key], distribution.total)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
