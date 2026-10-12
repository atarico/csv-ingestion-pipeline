import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NavLinks } from './NavLinks';

const usePathname = vi.hoisted(() => vi.fn<() => string>());
vi.mock('next/navigation', () => ({ usePathname }));

function activeLabels(): string[] {
  return screen
    .getAllByRole('link')
    .filter((link) => link.getAttribute('aria-current') === 'page')
    .map((link) => link.textContent ?? '');
}

describe('NavLinks', () => {
  beforeEach(() => usePathname.mockReset());

  it.each([
    ['/', 'Inicio'],
    ['/uploads', 'Uploads'],
    ['/uploads/new', 'Nuevo upload'],
    ['/uploads/3f1c2d9e-0000-4000-8000-000000000000', 'Uploads'],
  ])('marks exactly the matching link active on %s', (pathname, label) => {
    usePathname.mockReturnValue(pathname);
    render(<NavLinks />);
    expect(activeLabels()).toEqual([label]);
  });

  it('marks nothing active on an unknown route', () => {
    usePathname.mockReturnValue('/otra-ruta');
    render(<NavLinks />);
    expect(activeLabels()).toEqual([]);
  });

  it('exposes the navigation landmark', () => {
    usePathname.mockReturnValue('/');
    render(<NavLinks />);
    expect(screen.getByRole('navigation', { name: 'Principal' })).toBeInTheDocument();
  });
});
