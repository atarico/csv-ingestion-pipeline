import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { uploadsClient } from '../api/uploadsClient';
import { UploadList } from './UploadList';

vi.mock('../api/uploadsClient', () => ({ uploadsClient: { list: vi.fn() } }));

function renderList(page: number) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <UploadList page={page} />
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
    expect(screen.getByRole('link', { name: 'Volver a la primera página' })).toHaveAttribute('href', '/uploads?page=1');
  });
});
