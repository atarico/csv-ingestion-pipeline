import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { uploadsClient } from '../api/uploadsClient';
import type { UploadDto } from '../types/upload.types';
import { UploadDetail } from './UploadDetail';

vi.mock('../api/uploadsClient', () => ({
  uploadsClient: { getById: vi.fn(), results: vi.fn() },
}));

const ID = '11111111-1111-4111-8111-111111111111';
const FLAG = 'carbonbox:just-uploaded';
const BANNER = /El archivo se subió correctamente/;

const upload: UploadDto = {
  id: ID,
  fileName: 'data.csv',
  status: 'PENDING',
  totalRows: null,
  processedRows: null,
  failedRows: null,
  errorMessage: null,
  rowErrors: [],
  createdAt: '2024-01-15T10:30:00.000Z',
  updatedAt: '2024-01-15T10:30:00.000Z',
};

function renderDetail() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <UploadDetail id={ID} />
    </QueryClientProvider>,
  );
}

describe('UploadDetail uploaded banner', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.mocked(uploadsClient.getById).mockResolvedValue(upload);
  });

  it('shows the banner when the flag matches the page id and clears the flag', async () => {
    sessionStorage.setItem(FLAG, ID);
    renderDetail();

    expect(await screen.findByText(BANNER)).toBeInTheDocument();
    expect(screen.getByText(BANNER).closest('[role="status"]')).not.toBeNull();
    expect(sessionStorage.getItem(FLAG)).toBeNull();
  });

  it('does not show the banner without the flag or with another id', async () => {
    sessionStorage.setItem(FLAG, '22222222-2222-4222-8222-222222222222');
    renderDetail();

    expect(await screen.findByText('data.csv')).toBeInTheDocument();
    expect(screen.queryByText(BANNER)).not.toBeInTheDocument();
  });

  it('hides the banner with Cerrar aviso', async () => {
    sessionStorage.setItem(FLAG, ID);
    const user = userEvent.setup();
    renderDetail();
    await screen.findByText(BANNER);

    await user.click(screen.getByRole('button', { name: 'Cerrar aviso' }));

    expect(screen.queryByText(BANNER)).not.toBeInTheDocument();
  });
});
