import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { UploadStatsDto } from '../types/upload.types';
import { OutcomeFilterChips } from './OutcomeFilterChips';

const stats: UploadStatsDto = {
  total: 20,
  pending: 0,
  processing: 0,
  completed: 15,
  completedWithRowErrors: 5,
  failed: 5,
};

describe('OutcomeFilterChips', () => {
  it('renders one link per outcome inside a labelled nav', () => {
    render(<OutcomeFilterChips selected="all" />);

    expect(screen.getByRole('navigation', { name: 'Filtrar por resultado' })).toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(4);
  });

  it('marks only the selected chip with aria-current', () => {
    render(<OutcomeFilterChips selected="failed" />);

    expect(screen.getByRole('link', { name: /Fallidos/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /Todos/ })).not.toHaveAttribute('aria-current');
  });

  it('links each chip to its filter and resets the page', () => {
    render(<OutcomeFilterChips selected="all" />);

    expect(screen.getByRole('link', { name: /Todos/ })).toHaveAttribute('href', '/uploads');
    expect(screen.getByRole('link', { name: /Correctos/ })).toHaveAttribute('href', '/uploads?outcome=correct');
    expect(screen.getByRole('link', { name: /Con problemas/ })).toHaveAttribute('href', '/uploads?outcome=withProblems');
    expect(screen.getByRole('link', { name: /Fallidos/ })).toHaveAttribute('href', '/uploads?outcome=failed');
  });

  it('shows counts when stats are available', () => {
    render(<OutcomeFilterChips selected="all" stats={stats} />);

    expect(screen.getByRole('link', { name: /Correctos/ })).toHaveTextContent('10');
    expect(screen.getByRole('link', { name: /Con problemas/ })).toHaveTextContent('5');
  });
});
