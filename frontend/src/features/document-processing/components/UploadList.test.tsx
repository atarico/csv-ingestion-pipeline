import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { uploadsClient } from '../api/uploadsClient';
import { UploadList } from './UploadList';

vi.mock('../api/uploadsClient', () => ({ uploadsClient: { list: vi.fn(), stats: vi.fn() } }));

import type { OutcomeKey } from '../lib/outcomes';
import type { UploadSummaryDto } from '../types/upload.types';

const upload: UploadSummaryDto = {
  id: 'u-1',
  fileName: 'emisiones.csv',
  status: 'COMPLETED',
  totalRows: 60,
  processedRows: 60,
  failedRows: 0,
  createdAt: new Date(Date.now() - 5 * 60_000).toISOString(),
};

function renderList(page: number, outcome: OutcomeKey = 'all') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <UploadList page={page} outcome={outcome} />
    </QueryClientProvider>,
  );
}

describe('UploadList', () => {
  it('shows the empty message when there are no uploads at all', async () => {
    vi.mocked(uploadsClient.list).mockResolvedValue({ data: [], total: 0, page: 1, limit: 10, totalPages: 0 });
    renderList(1);

    expect(await screen.findByText('Todavía no hay uploads.')).toBeInTheDocument();
    expect(screen.queryByText('No hay uploads en esta página.')).not.toBeInTheDocument();
  });

  it('past the last page shows a message with a link back to page 1', async () => {
    vi.mocked(uploadsClient.list).mockResolvedValue({ data: [], total: 12, page: 9, limit: 10, totalPages: 2 });
    renderList(9);

    expect(await screen.findByText('No hay uploads en esta página.')).toBeInTheDocument();
    expect(screen.queryByText('Todavía no hay uploads.')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver a la primera página' })).toHaveAttribute('href', '/uploads');
  });

  it.each([
    ['all', {}],
    ['correct', { status: 'COMPLETED', hasRowErrors: false }],
    ['withProblems', { status: 'COMPLETED', hasRowErrors: true }],
    ['failed', { status: 'FAILED' }],
  ] as const)('requests the %s filter', async (outcome, filter) => {
    vi.mocked(uploadsClient.list).mockResolvedValue({ data: [upload], total: 1, page: 2, limit: 10, totalPages: 3 });
    renderList(2, outcome);

    await screen.findByText('emisiones.csv');
    expect(uploadsClient.list).toHaveBeenCalledWith(2, filter);
  });

  it('marks the selected chip', async () => {
    vi.mocked(uploadsClient.list).mockResolvedValue({ data: [upload], total: 1, page: 1, limit: 10, totalPages: 1 });
    renderList(1, 'failed');

    expect(await screen.findByRole('link', { name: /Fallidos/ })).toHaveAttribute('aria-current', 'page');
  });

  it('renders the row with processed/total and a detail link', async () => {
    vi.mocked(uploadsClient.list).mockResolvedValue({ data: [upload], total: 1, page: 1, limit: 10, totalPages: 1 });
    renderList(1);

    const row = (await screen.findByText('emisiones.csv')).closest('tr');
    expect(row).not.toBeNull();
    const scoped = within(row as HTMLElement);
    expect(scoped.getByRole('cell', { name: /60\/60/ })).toBeInTheDocument();
    expect(scoped.getByRole('link', { name: 'Ver detalle' })).toHaveAttribute('href', '/uploads/u-1');
    expect(scoped.getAllByText('hace 5 minutos').length).toBeGreaterThan(0);
  });

  it('keeps the outcome in the pagination links', async () => {
    vi.mocked(uploadsClient.list).mockResolvedValue({ data: [upload], total: 30, page: 2, limit: 10, totalPages: 3 });
    renderList(2, 'withProblems');

    await screen.findByText('emisiones.csv');
    expect(screen.getByRole('link', { name: 'Anterior' })).toHaveAttribute('href', '/uploads?outcome=withProblems');
    expect(screen.getByRole('link', { name: 'Siguiente' })).toHaveAttribute('href', '/uploads?outcome=withProblems&page=3');
  });

  it('shows a filter-specific empty state', async () => {
    vi.mocked(uploadsClient.list).mockResolvedValue({ data: [], total: 0, page: 1, limit: 10, totalPages: 0 });
    renderList(1, 'failed');

    expect(await screen.findByText('Todavía no hay cargas fallidas.')).toBeInTheDocument();
  });
});
