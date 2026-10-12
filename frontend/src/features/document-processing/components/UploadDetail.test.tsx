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
  errorCode: null,
  errorDetails: null,
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

describe('UploadDetail failure guidance', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('explains an invalid header with the missing columns and a sample link', async () => {
    vi.mocked(uploadsClient.getById).mockResolvedValue({
      ...upload,
      status: 'FAILED',
      errorMessage: 'Invalid CSV header: missing [date]',
      errorCode: 'INVALID_HEADER',
      errorDetails: { expected: ['category', 'amount', 'unit', 'date'], missing: ['date'], unexpected: [], duplicated: [] },
    });
    renderDetail();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('La primera fila del archivo no tiene las columnas esperadas');
    expect(alert).toHaveTextContent('Faltan: date');
    expect(alert).toHaveTextContent('Cabecera (primera línea del archivo)');
    expect(alert).not.toHaveTextContent('Invalid CSV header');
    expect(screen.getByRole('link', { name: 'Descargar un CSV de ejemplo' })).toHaveAttribute('href', '/ejemplo.csv');
    expect(screen.queryByRole('heading', { name: 'Filas con errores' })).not.toBeInTheDocument();
  });

  it('keeps the legacy title and raw message for records without a code', async () => {
    vi.mocked(uploadsClient.getById).mockResolvedValue({
      ...upload,
      status: 'FAILED',
      errorMessage: 'Something broke',
    });
    renderDetail();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('El procesamiento falló');
    expect(alert).toHaveTextContent('Something broke');
  });

  it('shows the row errors table below NO_VALID_ROWS', async () => {
    vi.mocked(uploadsClient.getById).mockResolvedValue({
      ...upload,
      status: 'FAILED',
      failedRows: 1,
      errorMessage: 'No valid rows found',
      errorCode: 'NO_VALID_ROWS',
      rowErrors: [{ row: 1, field: 'amount', code: 'INVALID_NUMBER', message: 'bad', value: 'abc' }],
    });
    renderDetail();

    expect(await screen.findByText('Ninguna fila pudo procesarse')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Filas con errores' })).toBeInTheDocument();
    expect(screen.getByText(/«abc» no es un número válido/)).toBeInTheDocument();
  });
});
