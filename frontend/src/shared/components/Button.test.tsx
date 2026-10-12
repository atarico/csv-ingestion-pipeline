import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('renders a link when href is given', () => {
    render(<Button href="/uploads/new">Nuevo upload</Button>);
    const link = screen.getByRole('link', { name: 'Nuevo upload' });
    expect(link).toHaveAttribute('href', '/uploads/new');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('renders a button of type button by default', () => {
    render(<Button>Subir</Button>);
    expect(screen.getByRole('button', { name: 'Subir' })).toHaveAttribute('type', 'button');
  });

  it('lets the caller choose the button type', () => {
    render(<Button type="submit">Enviar</Button>);
    expect(screen.getByRole('button', { name: 'Enviar' })).toHaveAttribute('type', 'submit');
  });

  it('forwards disabled to the button', () => {
    render(<Button disabled>Subir</Button>);
    expect(screen.getByRole('button', { name: 'Subir' })).toBeDisabled();
  });

  it.each([
    ['primary', 'bg-accent'],
    ['secondary', 'border-line-strong'],
    ['ghost', 'bg-transparent'],
  ] as const)('applies the %s variant classes', (variant, expected) => {
    render(<Button variant={variant}>Acción</Button>);
    const button = screen.getByRole('button', { name: 'Acción' });
    expect(button).toHaveClass(expected, 'rounded-full', 'font-semibold');
  });

  it('defaults to the primary variant', () => {
    render(<Button>Acción</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-accent');
  });

  it('gives a link the same variant classes as a button', () => {
    render(
      <Button href="/uploads" variant="secondary">
        Ver
      </Button>,
    );
    expect(screen.getByRole('link', { name: 'Ver' })).toHaveClass('border-line-strong', 'rounded-full');
  });
});
