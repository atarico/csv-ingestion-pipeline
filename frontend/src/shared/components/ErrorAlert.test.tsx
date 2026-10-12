import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ErrorAlert } from './ErrorAlert';

describe('ErrorAlert', () => {
  it('renders the message', () => {
    render(<ErrorAlert message="Algo falló" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Algo falló');
  });

  it('renders children below the title without a message', () => {
    render(
      <ErrorAlert title="Título">
        <p>Detalle en hijo</p>
      </ErrorAlert>,
    );
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Título');
    expect(alert).toHaveTextContent('Detalle en hijo');
  });
});
