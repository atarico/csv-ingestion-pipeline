import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RowHealthBar } from './RowHealthBar';

describe('RowHealthBar', () => {
  it('describes valid and invalid rows for assistive tech', () => {
    render(<RowHealthBar valid={12000} invalid={34} />);

    expect(screen.getByRole('img', { name: '12.000 filas válidas, 34 inválidas' })).toBeInTheDocument();
  });

  it('uses the singular form', () => {
    render(<RowHealthBar valid={1} invalid={1} />);

    expect(screen.getByRole('img', { name: '1 fila válida, 1 inválida' })).toBeInTheDocument();
  });

  it('sizes the segments by their share of the rows', () => {
    render(<RowHealthBar valid={75} invalid={25} />);

    expect(screen.getByTestId('row-health-valid')).toHaveStyle({ width: '75%' });
    expect(screen.getByTestId('row-health-invalid')).toHaveStyle({ width: '25%' });
  });

  it('labels an empty file without dividing by zero', () => {
    render(<RowHealthBar valid={0} invalid={0} />);

    expect(screen.getByRole('img', { name: 'Sin filas' })).toBeInTheDocument();
  });
});
