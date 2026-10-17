import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { UploadSummaryDto } from '../types/upload.types';
import { getOutcome } from '../lib/outcomes';
import { RecentUploadsPanel } from './RecentUploadsPanel';

const upload: UploadSummaryDto = {
  id: 'abc-1',
  fileName: 'emisiones.csv',
  status: 'COMPLETED',
  totalRows: 100,
  processedRows: 90,
  failedRows: 10,
  createdAt: new Date(Date.now() - 5 * 60_000).toISOString(),
};

describe('RecentUploadsPanel', () => {
  it('is a tabpanel labelled by the selected tab', () => {
    render(<RecentUploadsPanel outcome={getOutcome('failed')} uploads={[]} isLoading={false} onRetry={vi.fn()} />);

    const panel = screen.getByRole('tabpanel');
    expect(panel).toHaveAttribute('id', 'outcome-panel');
    expect(panel).toHaveAttribute('aria-labelledby', 'outcome-tab-failed');
    expect(screen.getByRole('heading', { name: 'Últimos 10 · Fallidos' })).toBeInTheDocument();
  });

  it('shows skeleton rows while loading', () => {
    render(<RecentUploadsPanel outcome={getOutcome('all')} uploads={undefined} isLoading onRetry={vi.fn()} />);

    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getAllByTestId('upload-skeleton')).toHaveLength(5);
  });

  it('shows the outcome-specific empty message', () => {
    render(<RecentUploadsPanel outcome={getOutcome('withProblems')} uploads={[]} isLoading={false} onRetry={vi.fn()} />);

    expect(screen.getByText('Todavía no hay cargas con problemas.')).toBeInTheDocument();
  });

  it('shows the error with a retry action', async () => {
    const onRetry = vi.fn();
    render(
      <RecentUploadsPanel
        outcome={getOutcome('all')}
        uploads={undefined}
        isLoading={false}
        errorMessage="No se pudo conectar con el servidor"
        onRetry={onRetry}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo conectar con el servidor');
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('renders rows that link to the upload detail with health and relative time', () => {
    render(<RecentUploadsPanel outcome={getOutcome('all')} uploads={[upload]} isLoading={false} onRetry={vi.fn()} />);

    const link = screen.getByRole('link', { name: /emisiones\.csv/ });
    expect(link).toHaveAttribute('href', '/uploads/abc-1');
    expect(link).toHaveTextContent('10 inválidas');
    expect(link).toHaveTextContent('hace 5 minutos');
    expect(screen.getByRole('img', { name: '90 filas válidas, 10 inválidas' })).toBeInTheDocument();
    expect(screen.getByText('Completado')).toBeInTheDocument();
  });

  it('links to the full list', () => {
    render(<RecentUploadsPanel outcome={getOutcome('all')} uploads={[]} isLoading={false} onRetry={vi.fn()} />);

    expect(screen.getByRole('link', { name: 'Ver todos' })).toHaveAttribute('href', '/uploads');
  });
});
