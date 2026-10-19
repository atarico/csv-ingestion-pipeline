import Link from 'next/link';
import type { ReactNode } from 'react';
import { BrandLogo } from './BrandLogo';
import { ThemeToggle } from '@/shared/theme/ThemeToggle';
import { NavLinks } from './NavLinks';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-surface-dark text-white">
        <div className="mx-auto flex min-h-[68px] max-w-5xl flex-wrap items-center gap-x-8 gap-y-2 px-4 py-2">
          <Link
            href="/"
            className="flex items-center gap-3 rounded focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-accent-light/40"
          >
            <BrandLogo height={26} className="text-white" />
            <span className="hidden text-xs font-semibold uppercase tracking-[0.14em] text-accent-light sm:inline">
              Captura de datos
            </span>
          </Link>
          <NavLinks />
          <div className="ml-auto flex items-center" data-slot="theme-toggle">
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
      <footer className="mx-auto w-full max-w-5xl px-4 pb-6 text-sm text-ink-muted">
        CSV Pipeline · Prueba técnica Full Stack · 2026
      </footer>
    </div>
  );
}
