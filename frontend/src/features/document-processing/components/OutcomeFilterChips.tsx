import Link from 'next/link';
import { formatNumber } from '@/shared/lib/format';
import { OUTCOMES, TONE_STYLES, uploadsListHref, type OutcomeKey } from '../lib/outcomes';
import type { UploadStatsDto } from '../types/upload.types';

interface OutcomeFilterChipsProps {
  selected: OutcomeKey;
  /** Optional: chips show their count once stats are available. */
  stats?: UploadStatsDto;
}

/** Outcome filter for the uploads list. Plain links: the filter lives in the URL and resets the page. */
export function OutcomeFilterChips({ selected, stats }: OutcomeFilterChipsProps) {
  return (
    <nav aria-label="Filtrar por resultado" className="-mx-1 flex flex-wrap gap-2 px-1">
      {OUTCOMES.map((outcome) => {
        const isSelected = outcome.key === selected;
        const tone = TONE_STYLES[outcome.tone];
        return (
          <Link
            key={outcome.key}
            href={uploadsListHref(outcome.key)}
            aria-current={isSelected ? 'page' : undefined}
            className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition duration-150 ease-brand motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              isSelected
                ? `border-transparent bg-surface text-ink shadow-card ring-2 ${tone.ring}`
                : 'border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink'
            }`}
          >
            <span aria-hidden="true" className={`h-2 w-2 rounded-full ${tone.dot}`} />
            {outcome.label}
            {stats ? (
              <span className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${isSelected ? tone.chip : 'bg-bg text-ink-subtle'}`}>
                {formatNumber(outcome.countFor(stats))}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
