'use client';

import { useEffect, useRef, useState } from 'react';
import { formatNumber } from '@/shared/lib/format';

const DURATION_MS = 600;

/** Count-up only where it is safe and possible: no reduced-motion preference, real browser APIs. */
function canAnimate(): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof window.matchMedia !== 'function' || typeof window.requestAnimationFrame !== 'function') return false;
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function easeOutCubic(progress: number): number {
  return 1 - (1 - progress) ** 3;
}

interface AnimatedNumberProps {
  value: number;
  className?: string;
}

/**
 * Counts up to `value`. The final formatted number is always in the accessible text: while
 * animating, the moving digits are `aria-hidden` and a screen-reader-only copy holds the result.
 */
export function AnimatedNumber({ value, className = '' }: AnimatedNumberProps) {
  // `null` means "show the final value" (not animating).
  const [frame, setFrame] = useState<number | null>(() => (canAnimate() ? 0 : null));
  const shownRef = useRef(0);

  useEffect(() => {
    if (!canAnimate()) return;
    const from = shownRef.current;
    let startedAt: number | null = null;
    let handle = 0;

    const step = (timestamp: number) => {
      startedAt ??= timestamp;
      const progress = Math.min(1, (timestamp - startedAt) / DURATION_MS);
      if (progress >= 1) {
        shownRef.current = value;
        setFrame(null);
        return;
      }
      shownRef.current = Math.round(from + (value - from) * easeOutCubic(progress));
      setFrame(shownRef.current);
      handle = window.requestAnimationFrame(step);
    };

    handle = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(handle);
  }, [value]);

  const finalText = formatNumber(value);
  if (frame === null) return <span className={className}>{finalText}</span>;

  return (
    <span className={className}>
      <span aria-hidden="true">{formatNumber(frame)}</span>
      <span className="sr-only">{finalText}</span>
    </span>
  );
}
