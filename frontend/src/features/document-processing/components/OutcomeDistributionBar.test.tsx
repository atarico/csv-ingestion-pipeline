import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OutcomeDistributionBar } from './OutcomeDistributionBar';

const stats = { total: 12, pending: 0, processing: 0, completed: 8, failed: 2, completedWithRowErrors: 3 };

describe('OutcomeDistributionBar', () => {
  it('summarizes the split of finished uploads in an accessible label', () => {
    render(<OutcomeDistributionBar stats={stats} />);

    expect(
      screen.getByRole('img', { name: 'Distribución de resultados: 5 correctos, 3 con problemas, 2 fallidos' }),
    ).toBeInTheDocument();
  });

  it('lists each segment with its count and share in the legend', () => {
    render(<OutcomeDistributionBar stats={stats} />);

    expect(screen.getByText('Correctos').closest('li')).toHaveTextContent('5');
    expect(screen.getByText('Correctos').closest('li')).toHaveTextContent('50%');
    expect(screen.getByText('Con problemas').closest('li')).toHaveTextContent('30%');
    expect(screen.getByText('Fallidos').closest('li')).toHaveTextContent('20%');
  });

  it('shows a neutral empty state when nothing has finished', () => {
    render(<OutcomeDistributionBar stats={{ ...stats, completed: 0, failed: 0, completedWithRowErrors: 0 }} />);

    expect(screen.getByText('Aún no hay cargas finalizadas.')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
