import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { RowErrorDto } from '../types/upload.types';
import { RowErrorsTable } from './RowErrorsTable';

function bodyRow(index: number): HTMLElement {
  const row = screen.getAllByRole('row')[index];
  if (!row) throw new Error(`missing row ${index}`);
  return row;
}

const errors: RowErrorDto[] = [
  { row: 3, field: 'amount', code: 'INVALID_NUMBER', message: 'Amount must be a number', value: '-12.5' },
  { row: 7, field: 'unit', code: 'REQUIRED', message: 'Unit is required' },
  { row: 9, code: 'INVALID', message: 'Something odd' },
];

describe('RowErrorsTable', () => {
  it('renders the four guidance columns', () => {
    render(<RowErrorsTable errors={errors} failedRows={3} />);

    const headers = screen.getAllByRole('columnheader').map((header) => header.textContent);
    expect(headers).toEqual(['Fila', 'Columna', 'Valor', 'Qué pasa y cómo corregirlo']);
  });

  it('shows the row, the verbatim field, the value and the Spanish explanation', () => {
    render(<RowErrorsTable errors={errors} failedRows={3} />);

    const row = bodyRow(1);
    expect(within(row).getAllByRole('cell')[0]).toHaveTextContent(/^3/);
    expect(within(row).getByRole('cell', { name: 'amount' })).toBeInTheDocument();
    const value = within(row).getByRole('cell', { name: '-12.5' });
    expect(value).toHaveClass('font-mono');
    expect(row).toHaveTextContent('«-12.5» no es un número válido');
  });

  it('uses a dash when the value or the field is missing', () => {
    render(<RowErrorsTable errors={errors} failedRows={3} />);

    const withoutValue = bodyRow(2);
    expect(within(withoutValue).getAllByRole('cell', { name: '—' })).toHaveLength(1);
    const withoutField = bodyRow(3);
    expect(within(withoutField).getAllByRole('cell', { name: '—' })).toHaveLength(2);
    expect(withoutField).toHaveTextContent('Something odd');
  });

  it('always explains how rows are numbered', () => {
    render(<RowErrorsTable errors={errors} failedRows={3} />);
    expect(screen.getByText('La fila 1 es la primera después de la cabecera.')).toBeInTheDocument();
    expect(screen.queryByText(/Se muestran los primeros/)).not.toBeInTheDocument();
  });

  it('notes when only the first errors are shown', () => {
    render(<RowErrorsTable errors={errors} failedRows={250} />);
    expect(screen.getByText('Se muestran los primeros 3 errores de 250.')).toBeInTheDocument();
    expect(screen.getByText('La fila 1 es la primera después de la cabecera.')).toBeInTheDocument();
  });

  it('offers a chip per field with its count and filters client-side', async () => {
    render(<RowErrorsTable errors={errors} failedRows={3} />);

    const group = screen.getByRole('group', { name: 'Filtrar por columna' });
    expect(within(group).getByRole('button', { name: 'Todas 3' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(group).getByRole('button', { name: 'amount 1' })).toBeInTheDocument();
    expect(within(group).getByRole('button', { name: 'unit 1' })).toBeInTheDocument();
    expect(within(group).getByRole('button', { name: 'Sin columna 1' })).toBeInTheDocument();

    await userEvent.click(within(group).getByRole('button', { name: 'unit 1' }));

    expect(screen.getAllByRole('row')).toHaveLength(2);
    expect(bodyRow(1)).toHaveTextContent('La celda está vacía');
    expect(within(group).getByRole('button', { name: 'unit 1' })).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(within(group).getByRole('button', { name: 'Todas 3' }));
    expect(screen.getAllByRole('row')).toHaveLength(4);
  });

  it('hides the chips when every error is in the same field', () => {
    render(<RowErrorsTable errors={[errors[0] as RowErrorDto]} failedRows={1} />);
    expect(screen.queryByRole('group', { name: 'Filtrar por columna' })).not.toBeInTheDocument();
  });

  it('paginates 25 errors per page', async () => {
    const many: RowErrorDto[] = Array.from({ length: 30 }, (_, index) => ({
      row: index + 1,
      field: 'amount',
      code: 'INVALID_NUMBER',
      message: 'bad',
      value: `v${index + 1}`,
    }));
    render(<RowErrorsTable errors={many} failedRows={30} />);

    expect(screen.getAllByRole('row')).toHaveLength(26);
    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));

    expect(screen.getAllByRole('row')).toHaveLength(6);
    expect(screen.getByText('Página 2 de 2')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'v30' })).toBeInTheDocument();
  });
});
