import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProgressBar } from './ProgressBar';

describe('ProgressBar', () => {
  it.each([
    [-5, '0'],
    [150, '100'],
    [42, '42'],
  ])('clamps aria-valuenow to 0..100 (%s -> %s)', (value, expected) => {
    render(<ProgressBar value={value} label="Progreso" />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', expected);
    expect(bar.firstElementChild).toHaveStyle({ width: `${expected}%` });
  });
});
