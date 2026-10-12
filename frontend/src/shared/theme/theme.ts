export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'carbonbox-theme';

function isTheme(value: string | null | undefined): value is Theme {
  return value === 'light' || value === 'dark';
}

/** A valid stored choice wins; otherwise the system preference decides. */
export function resolveTheme(stored: string | null, prefersDark: boolean): Theme {
  if (isTheme(stored)) return stored;
  return prefersDark ? 'dark' : 'light';
}

export function applyTheme(root: HTMLElement, theme: Theme): void {
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
}

export function readTheme(root: HTMLElement): Theme {
  const current = root.dataset.theme;
  return isTheme(current) ? current : 'light';
}
