'use client';

import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { AnimatedNumber } from '@/shared/components/AnimatedNumber';
import { AlertIcon, CheckCircleIcon, LayersIcon, XCircleIcon } from '@/shared/components/icons';
import {
  OUTCOMES,
  OUTCOME_PANEL_ID,
  TONE_STYLES,
  outcomeTabId,
  shareOf,
  type OutcomeDefinition,
  type OutcomeKey,
} from '../lib/outcomes';
import type { UploadStatsDto } from '../types/upload.types';

const ICONS: Record<OutcomeKey, ReactNode> = {
  all: <LayersIcon className="h-5 w-5" />,
  correct: <CheckCircleIcon className="h-5 w-5" />,
  withProblems: <AlertIcon className="h-5 w-5" />,
  failed: <XCircleIcon className="h-5 w-5" />,
};

interface OutcomeTabsProps {
  stats: UploadStatsDto;
  selected: OutcomeKey;
  onSelect: (key: OutcomeKey) => void;
}

function caption(outcome: OutcomeDefinition, stats: UploadStatsDto): string {
  if (outcome.key === 'all') return 'Todas las cargas';
  return `${shareOf(outcome.countFor(stats), stats.total)}% del total`;
}

/** Outcome cards as a WAI-ARIA tablist: arrows/Home/End move focus and selection together. */
export function OutcomeTabs({ stats, selected, onSelect }: OutcomeTabsProps) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const move = (index: number) => {
    const target = OUTCOMES[(index + OUTCOMES.length) % OUTCOMES.length];
    if (target === undefined) return;
    onSelect(target.key);
    tabRefs.current[OUTCOMES.indexOf(target)]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const handlers: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: OUTCOMES.length - 1,
    };
    const next = handlers[event.key];
    if (next === undefined) return;
    event.preventDefault();
    move(next);
  };

  return (
    <div
      role="tablist"
      aria-label="Resultados de los uploads"
      className="relative z-10 -mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
    >
      {OUTCOMES.map((outcome, index) => {
        const isSelected = outcome.key === selected;
        const tone = TONE_STYLES[outcome.tone];
        return (
          <button
            key={outcome.key}
            ref={(node) => {
              tabRefs.current[index] = node;
            }}
            type="button"
            role="tab"
            id={outcomeTabId(outcome.key)}
            aria-selected={isSelected}
            aria-controls={OUTCOME_PANEL_ID}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onSelect(outcome.key)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={`relative rounded-card border bg-surface p-4 text-left sm:p-5 transition duration-200 ease-brand motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              isSelected
                ? `border-transparent shadow-[0_18px_40px_-18px_rgb(13_18_48/0.55)] ring-2 ${tone.ring}`
                : 'border-line shadow-card hover:-translate-y-0.5 hover:border-line-strong motion-reduce:hover:translate-y-0'
            }`}
          >
            <span className="flex items-center gap-3">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone.chip}`}>
                {ICONS[outcome.key]}
              </span>
              <span className="text-sm font-medium text-ink-muted">{outcome.cardTitle}</span>
            </span>{' '}
            <AnimatedNumber
              value={outcome.countFor(stats)}
              className="mt-3 block text-3xl font-semibold sm:mt-4 sm:text-4xl leading-none tabular-nums text-ink"
            />{' '}
            <span className="mt-2 block text-xs text-ink-subtle">{caption(outcome, stats)}</span>
            {isSelected ? (
              <span
                aria-hidden="true"
                className={`absolute -bottom-[9px] left-1/2 hidden h-4 w-4 -translate-x-1/2 rotate-45 border-b-2 border-r-2 bg-surface lg:block ${tone.notch}`}
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
