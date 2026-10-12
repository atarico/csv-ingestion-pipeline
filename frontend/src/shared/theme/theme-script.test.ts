import { describe, expect, it } from 'vitest';
import { themeScript } from './theme-script';

function run(stored: string | null, prefersDark: boolean, storageThrows = false) {
  const root = { dataset: {} as Record<string, string>, style: {} as Record<string, string> };
  const document = { documentElement: root };
  const localStorage = {
    getItem: () => {
      if (storageThrows) throw new Error('blocked');
      return stored;
    },
  };
  const matchMedia = () => ({ matches: prefersDark });
  new Function('document', 'localStorage', 'matchMedia', themeScript)(document, localStorage, matchMedia);
  return root;
}

describe('themeScript', () => {
  it.each([
    ['dark', false, 'dark'],
    ['light', true, 'light'],
    [null, true, 'dark'],
    [null, false, 'light'],
    ['garbage', true, 'dark'],
  ] as const)('stored %s, prefersDark %s sets data-theme=%s', (stored, prefersDark, expected) => {
    const root = run(stored, prefersDark);
    expect(root.dataset.theme).toBe(expected);
    expect(root.style.colorScheme).toBe(expected);
  });

  it('never throws when storage is blocked and falls back to the system preference', () => {
    expect(run(null, true, true).dataset.theme).toBe('dark');
  });

  it('is plain ES5 (no arrow functions, const or let)', () => {
    expect(themeScript).not.toMatch(/=>|\bconst\b|\blet\b/);
  });
});
