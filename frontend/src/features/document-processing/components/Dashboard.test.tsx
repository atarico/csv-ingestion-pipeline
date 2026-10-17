import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { uploadsClient } from '../api/uploadsClient';
import type { UploadStatsDto, UploadSummaryDto } from '../types/upload.types';
import { Dashboard } from './Dashboard';

vi.mock('../api/uploadsClient', () => ({ uploadsClient: { list: vi.fn(), stats: vi.fn() } }));

const stats: UploadStatsDto = { total: 20, pending: 1, processing: 2, completed: 14, failed: 4, completedWithRowErrors: 5 };

function summary(id: string, fileName: string, status: UploadSummaryDto['status'] = 'COMPLETED'): UploadSummaryDto {
  return {
    id,
    fileName,
    status,
    totalRows: 10,
    processedRows: 8,
    failedRows: 2,
    createdAt: new Date().toISOString(),
  };
}

function page(data: UploadSummaryDto[]) {
  return { data, total: data.length, page: 1, limit: 10, totalPages: 1 };
}

function renderDashboard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <Dashboard />
    </QueryClientProvider>,
  );
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.mocked(uploadsClient.list).mockReset();
    vi.mocked(uploadsClient.stats).mockReset();
    vi.mocked(uploadsClient.stats).mockResolvedValue(stats);
    vi.mocked(uploadsClient.list).mockResolvedValue(page([summary('u-1', 'todos.csv')]));
  });

  it('renders the four outcome cards with counts (correct = completed - with problems)', async () => {
    renderDashboard();

    expect(await screen.findByRole('tab', { name: /^Total de uploads 20/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^Correctos 9/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^Con problemas 5/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^Fallidos 4/ })).toBeInTheDocument();
  });

  it('selects "Todos" by default and lists the latest uploads linking to their detail', async () => {
    renderDashboard();

    const link = await screen.findByRole('link', { name: /todos\.csv/ });

    expect(link).toHaveAttribute('href', '/uploads/u-1');
    expect(screen.getByRole('tab', { name: /^Total de uploads/ })).toHaveAttribute('aria-selected', 'true');
    expect(uploadsClient.list).toHaveBeenCalledWith(1, { limit: 10 });
  });

  it('requests the filtered list when selecting "Con problemas"', async () => {
    vi.mocked(uploadsClient.list).mockImplementation((_page, options) =>
      Promise.resolve(options?.hasRowErrors === true ? page([summary('u-9', 'problemas.csv')]) : page([])),
    );
    renderDashboard();

    await userEvent.click(await screen.findByRole('tab', { name: /^Con problemas/ }));

    expect(await screen.findByRole('link', { name: /problemas\.csv/ })).toHaveAttribute('href', '/uploads/u-9');
    expect(uploadsClient.list).toHaveBeenCalledWith(1, { limit: 10, status: 'COMPLETED', hasRowErrors: true });
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'outcome-tab-withProblems');
  });

  it('shows the outcome-specific empty state', async () => {
    vi.mocked(uploadsClient.list).mockResolvedValue(page([]));
    renderDashboard();

    await userEvent.click(await screen.findByRole('tab', { name: /^Fallidos/ }));

    expect(await screen.findByText('Todavía no hay cargas fallidas.')).toBeInTheDocument();
  });

  it('moves the selection with ArrowRight', async () => {
    renderDashboard();
    const first = await screen.findByRole('tab', { name: /^Total de uploads/ });
    first.focus();

    await userEvent.keyboard('{ArrowRight}');

    expect(screen.getByRole('tab', { name: /^Correctos/ })).toHaveAttribute('aria-selected', 'true');
    expect(uploadsClient.list).toHaveBeenCalledWith(1, { limit: 10, status: 'COMPLETED', hasRowErrors: false });
  });

  it('shows the live in-progress indicator (pending + processing)', async () => {
    renderDashboard();

    expect(await screen.findByText('3 en proceso')).toBeInTheDocument();
  });

  it('shows the idle indicator when nothing is in progress', async () => {
    vi.mocked(uploadsClient.stats).mockResolvedValue({ ...stats, pending: 0, processing: 0 });
    renderDashboard();

    expect(await screen.findByText('Sin procesos activos')).toBeInTheDocument();
  });

  it('keeps the call to action and shows a retryable error when stats fail', async () => {
    vi.mocked(uploadsClient.stats).mockRejectedValue(new Error('boom'));
    renderDashboard();

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(within(document.body).getByRole('link', { name: 'Nuevo upload' })).toHaveAttribute('href', '/uploads/new');
  });
});
