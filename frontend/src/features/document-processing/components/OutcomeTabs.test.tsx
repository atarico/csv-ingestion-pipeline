import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { OutcomeTabs } from './OutcomeTabs';

const stats = { total: 20, pending: 1, processing: 1, completed: 14, failed: 4, completedWithRowErrors: 5 };

describe('OutcomeTabs', () => {
  it('renders a labelled tablist with one tab per outcome and its count', () => {
    render(<OutcomeTabs stats={stats} selected="all" onSelect={vi.fn()} />);

    expect(screen.getByRole('tablist', { name: 'Resultados de los uploads' })).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(4);
    expect(screen.getByRole('tab', { name: /^Total de uploads 20/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^Correctos 9/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^Con problemas 5/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^Fallidos 4/ })).toBeInTheDocument();
  });

  it('marks only the selected tab and wires it to the panel (roving tabindex)', () => {
    render(<OutcomeTabs stats={stats} selected="failed" onSelect={vi.fn()} />);

    const selected = screen.getByRole('tab', { name: /^Fallidos/ });
    expect(selected).toHaveAttribute('aria-selected', 'true');
    expect(selected).toHaveAttribute('aria-controls', 'outcome-panel');
    expect(selected).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('tab', { name: /^Correctos/ })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tab', { name: /^Correctos/ })).toHaveAttribute('tabindex', '-1');
  });

  it('selects a tab on click', async () => {
    const onSelect = vi.fn();
    render(<OutcomeTabs stats={stats} selected="all" onSelect={onSelect} />);

    await userEvent.click(screen.getByRole('tab', { name: /^Con problemas/ }));

    expect(onSelect).toHaveBeenCalledWith('withProblems');
  });

  it('moves focus and selection with the arrow, Home and End keys', async () => {
    const onSelect = vi.fn();
    render(<OutcomeTabs stats={stats} selected="correct" onSelect={onSelect} />);
    screen.getByRole('tab', { name: /^Correctos/ }).focus();

    await userEvent.keyboard('{ArrowRight}');
    expect(onSelect).toHaveBeenLastCalledWith('withProblems');
    expect(screen.getByRole('tab', { name: /^Con problemas/ })).toHaveFocus();

    await userEvent.keyboard('{End}');
    expect(onSelect).toHaveBeenLastCalledWith('failed');

    await userEvent.keyboard('{Home}');
    expect(onSelect).toHaveBeenLastCalledWith('all');
  });

  it('wraps around at both ends', async () => {
    const onSelect = vi.fn();
    render(<OutcomeTabs stats={stats} selected="all" onSelect={onSelect} />);
    screen.getByRole('tab', { name: /^Total de uploads/ }).focus();

    await userEvent.keyboard('{ArrowLeft}');

    expect(onSelect).toHaveBeenLastCalledWith('failed');
  });
});
