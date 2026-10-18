import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { UploadDto } from '../types/upload.types';
import { UploadDetailSummary } from './UploadDetailSummary';

const base: UploadDto = {
  id: 'id-1',
  fileName: 'emissions-2024.csv',
  status: 'COMPLETED',
  totalRows: 25,
  processedRows: 19,
  failedRows: 6,
  errorMessage: null,
  errorCode: null,
  errorDetails: null,
  rowErrors: [],
  createdAt: '2024-01-15T10:30:00.000Z',
  updatedAt: '2024-01-15T10:31:00.000Z',
};

function tile(label: string): HTMLElement {
  const element = screen.getByText(label).parentElement;
  if (!element) throw new Error(`missing tile ${label}`);
  return element;
}

describe('UploadDetailSummary', () => {
  it('shows the file name with a title, the status and absolute dates in <time>', () => {
    render(<UploadDetailSummary upload={base} />);

    const name = screen.getByRole('heading', { name: 'emissions-2024.csv' });
    expect(name).toHaveAttribute('title', 'emissions-2024.csv');
    expect(screen.getByText('Completado')).toBeInTheDocument();
    const times = document.querySelectorAll('time');
    expect(times).toHaveLength(2);
    expect(times[0]).toHaveAttribute('datetime', base.createdAt);
    expect(times[0]?.getAttribute('title')).toMatch(/^15\/01\/2024 \d{2}:\d{2}$/);
  });

  it('shows stat tiles, the health bar and the caption for a completed upload with errors', () => {
    render(<UploadDetailSummary upload={base} />);

    expect(within(tile('Filas totales')).getByText('25')).toBeInTheDocument();
    expect(within(tile('Filas válidas')).getByText('19')).toBeInTheDocument();
    expect(within(tile('Filas con errores')).getByText('6')).toBeInTheDocument();
    expect(tile('% válidas')).toHaveTextContent('76%');
    expect(screen.getByRole('img', { name: '19 filas válidas, 6 inválidas' })).toBeInTheDocument();
    expect(screen.getByText('Filas procesadas: 19 · Filas con errores: 6')).toBeInTheDocument();
  });

  it('shows 100% for a clean upload', () => {
    render(<UploadDetailSummary upload={{ ...base, totalRows: 60, processedRows: 60, failedRows: 0 }} />);

    expect(tile('% válidas')).toHaveTextContent('100%');
    expect(screen.getByText('Filas procesadas: 60 · Filas con errores: 0')).toBeInTheDocument();
  });

  it('shows the progress instead of tiles while processing', () => {
    render(<UploadDetailSummary upload={{ ...base, status: 'PROCESSING', totalRows: 100, processedRows: 30, failedRows: 10 }} />);

    expect(screen.getByRole('progressbar', { name: 'Progreso de procesamiento' })).toHaveAttribute('aria-valuenow', '40');
    expect(screen.queryByText('Filas totales')).not.toBeInTheDocument();
  });

  it('shows no tiles for a failed upload', () => {
    render(<UploadDetailSummary upload={{ ...base, status: 'FAILED', processedRows: null, failedRows: null }} />);

    expect(screen.queryByText('Filas totales')).not.toBeInTheDocument();
    expect(screen.getByText('Fallido')).toBeInTheDocument();
  });
});
