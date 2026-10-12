import { THEME_STORAGE_KEY } from './theme';

/**
 * Runs in <head> before first paint so the page never flashes the wrong theme.
 * Plain ES5 on purpose: it is inlined as a string and must mirror `resolveTheme`.
 */
export const themeScript = `try {
  var stored = null;
  try { stored = localStorage.getItem('${THEME_STORAGE_KEY}'); } catch (e) {}
  var theme = stored === 'light' || stored === 'dark'
    ? stored
    : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  var root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
} catch (e) {}`;
