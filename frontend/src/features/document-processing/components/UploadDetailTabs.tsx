'use client';

import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { formatNumber } from '@/shared/lib/format';
import { TONE_STYLES, type OutcomeTone } from '../lib/outcomes';

export type DetailTabKey = 'data' | 'errors';

export interface DetailTab {
  key: DetailTabKey;
  label: string;
  count: number;
  tone: OutcomeTone;
}

interface UploadDetailTabsProps {
  tabs: DetailTab[];
  selected: DetailTabKey;
  onSelect: (key: DetailTabKey) => void;
  children: ReactNode;
}

/** WAI-ARIA tabs: arrows/Home/End move focus and selection together; the panel is the children. */
export function UploadDetailTabs({ tabs, selected, onSelect, children }: UploadDetailTabsProps) {
  const baseId = useId();
  const panelId = `${baseId}-panel`;
  const tabId = (key: DetailTabKey) => `${baseId}-tab-${key}`;
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const move = (index: number) => {
    const target = tabs[(index + tabs.length) % tabs.length];
    if (target === undefined) return;
    onSelect(target.key);
    tabRefs.current[tabs.indexOf(target)]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const targets: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: tabs.length - 1,
    };
    const next = targets[event.key];
    if (next === undefined) return;
    event.preventDefault();
    move(next);
  };

  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="Contenido del upload" className="flex gap-1 border-b border-line">
        {tabs.map((tab, index) => {
          const isSelected = tab.key === selected;
          const tone = TONE_STYLES[tab.tone];
          return (
            <button
              key={tab.key}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              type="button"
              role="tab"
              id={tabId(tab.key)}
              aria-selected={isSelected}
              aria-controls={panelId}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => onSelect(tab.key)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={`relative -mb-px flex min-w-0 whitespace-nowrap flex-1 items-center justify-center gap-1.5 border-b-2 px-2 py-3 text-xs sm:flex-none sm:gap-2 sm:px-4 sm:text-sm font-semibold transition-colors duration-150 ease-brand motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent ${
                isSelected ? `${tone.notch} text-ink` : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              <span aria-hidden="true" className={`h-2 w-2 rounded-full ${tone.dot}`} />
              {tab.label}{' '}
              <span className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${isSelected ? tone.chip : 'bg-bg text-ink-subtle'}`}>
                {formatNumber(tab.count)}
              </span>
            </button>
          );
        })}
      </div>
      <div role="tabpanel" id={panelId} aria-labelledby={tabId(selected)} className="space-y-3 motion-safe:animate-card-in">
        {children}
      </div>
    </div>
  );
}
