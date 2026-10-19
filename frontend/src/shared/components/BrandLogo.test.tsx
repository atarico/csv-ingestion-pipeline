import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BrandLogo } from './BrandLogo';

describe('BrandLogo', () => {
  it('shows the product name as text and hides the decorative mark', () => {
    const { container } = render(<BrandLogo />);

    expect(screen.getByText('CSV Pipeline')).toBeInTheDocument();
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('carries no third-party brand', () => {
    const { container } = render(<BrandLogo />);

    expect(container.innerHTML).not.toMatch(/carbon/i);
  });

  it('sizes the mark from the height prop', () => {
    const { container } = render(<BrandLogo height={40} />);

    expect(container.querySelector('svg')).toHaveAttribute('height', '40');
  });
});
