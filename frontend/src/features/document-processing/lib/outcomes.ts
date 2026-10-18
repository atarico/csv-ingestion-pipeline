import type { UploadStatsDto, UploadStatusValue } from '../types/upload.types';

export type OutcomeKey = 'all' | 'correct' | 'withProblems' | 'failed';
export type OutcomeTone = 'primary' | 'accent' | 'warning' | 'danger';

/** Query filter understood by `GET /uploads`. */
export interface UploadListFilter {
  status?: UploadStatusValue;
  hasRowErrors?: boolean;
}

export interface OutcomeDefinition {
  key: OutcomeKey;
  /** Short name, used in the panel header and the legend. */
  label: string;
  /** Title of the dashboard card. */
  cardTitle: string;
  tone: OutcomeTone;
  filter: UploadListFilter;
  emptyMessage: string;
  countFor: (stats: UploadStatsDto) => number;
}

/** Completed uploads whose every row was valid. Clamped: stats come from separate counters. */
function correctCount(stats: UploadStatsDto): number {
  return Math.max(0, stats.completed - stats.completedWithRowErrors);
}

export const OUTCOMES: readonly OutcomeDefinition[] = [
  {
    key: 'all',
    label: 'Todos',
    cardTitle: 'Total de uploads',
    tone: 'primary',
    filter: {},
    emptyMessage: 'Todavía no hay uploads.',
    countFor: (stats) => stats.total,
  },
  {
    key: 'correct',
    label: 'Correctos',
    cardTitle: 'Correctos',
    tone: 'accent',
    filter: { status: 'COMPLETED', hasRowErrors: false },
    emptyMessage: 'Todavía no hay cargas correctas.',
    countFor: correctCount,
  },
  {
    key: 'withProblems',
    label: 'Con problemas',
    cardTitle: 'Con problemas',
    tone: 'warning',
    filter: { status: 'COMPLETED', hasRowErrors: true },
    emptyMessage: 'Todavía no hay cargas con problemas.',
    countFor: (stats) => stats.completedWithRowErrors,
  },
  {
    key: 'failed',
    label: 'Fallidos',
    cardTitle: 'Fallidos',
    tone: 'danger',
    filter: { status: 'FAILED' },
    emptyMessage: 'Todavía no hay cargas fallidas.',
    countFor: (stats) => stats.failed,
  },
];

export function getOutcome(key: OutcomeKey): OutcomeDefinition {
  const outcome = OUTCOMES.find((candidate) => candidate.key === key);
  if (outcome === undefined) throw new Error(`Unknown outcome: ${key}`);
  return outcome;
}

/** Tailwind classes per tone. Full class names so the compiler can see them. */
export const TONE_STYLES: Record<OutcomeTone, { chip: string; ring: string; dot: string; bar: string; notch: string }> = {
  primary: { chip: 'bg-primary-soft text-primary', ring: 'ring-primary', dot: 'bg-primary', bar: 'bg-primary', notch: 'border-primary' },
  accent: { chip: 'bg-accent-soft text-accent', ring: 'ring-accent', dot: 'bg-accent', bar: 'bg-accent', notch: 'border-accent' },
  warning: { chip: 'bg-warning-soft text-warning', ring: 'ring-warning', dot: 'bg-warning', bar: 'bg-warning', notch: 'border-warning' },
  danger: { chip: 'bg-danger-soft text-danger', ring: 'ring-danger', dot: 'bg-danger', bar: 'bg-danger', notch: 'border-danger' },
};

/** Rounded percentage of `part` over `whole`; 0 when there is nothing to divide by. */
export function shareOf(part: number, whole: number): number {
  return whole > 0 ? Math.round((part * 100) / whole) : 0;
}

export interface OutcomeDistribution {
  correct: number;
  withProblems: number;
  failed: number;
  /** Finished uploads: completed + failed. */
  total: number;
}

export function distributionOf(stats: UploadStatsDto): OutcomeDistribution {
  const correct = correctCount(stats);
  const withProblems = stats.completedWithRowErrors;
  const failed = stats.failed;
  return { correct, withProblems, failed, total: correct + withProblems + failed };
}

export const OUTCOME_PANEL_ID = 'outcome-panel';

export function outcomeTabId(key: OutcomeKey): string {
  return `outcome-tab-${key}`;
}
