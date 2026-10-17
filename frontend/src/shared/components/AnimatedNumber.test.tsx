import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AnimatedNumber } from './AnimatedNumber';

afterEach(() => vi.unstubAllGlobals());

function stubMotion(reduced: boolean) {
  const callbacks: FrameRequestCallback[] = [];
  vi.stubGlobal('matchMedia', () => ({ matches: reduced }));
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => callbacks.push(callback));
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
  return callbacks;
}

describe('AnimatedNumber', () => {
  it('renders the final formatted value right away when animation is unavailable (jsdom)', () => {
    render(<AnimatedNumber value={12345} />);

    expect(screen.getByText('12.345')).toBeInTheDocument();
  });

  it('skips the animation under prefers-reduced-motion', () => {
    const callbacks = stubMotion(true);
    render(<AnimatedNumber value={42} />);

    expect(screen.getByText('42')).toBeInTheDocument();
    expect(callbacks).toHaveLength(0);
  });

  it('exposes the final value to assistive tech while counting up', () => {
    const callbacks = stubMotion(false);
    const { container } = render(<AnimatedNumber value={100} />);

    expect(container.querySelector('[aria-hidden="true"]')).toHaveTextContent('0');
    expect(screen.getByText('100')).toHaveClass('sr-only');

    act(() => callbacks.shift()?.(0));
    act(() => callbacks.shift()?.(10_000));

    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
    expect(screen.getByText('100')).toBeInTheDocument();
  });
});
