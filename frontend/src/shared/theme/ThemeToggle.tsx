'use client';

import { MoonIcon, SunIcon } from '@/shared/components/icons';
import { useTheme } from './ThemeProvider';

/** Header switch; it always sits on the navy header, so it is light-on-dark in both themes. */
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white/80 transition-colors duration-150 ease-brand hover:bg-white/10 hover:text-white motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-accent-light/60"
    >
      {isDark ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
    </button>
  );
}
