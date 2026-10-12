import { describe, expect, it } from 'vitest';
import { applyTheme, readTheme, resolveTheme, THEME_STORAGE_KEY } from './theme';

describe('resolveTheme', () => {
  it.each([
    ['dark', false, 'dark'],
    ['dark', true, 'dark'],
    ['light', false, 'light'],
    ['light', true, 'light'],
    ['garbage', false, 'light'],
    ['garbage', true, 'dark'],
    [null, false, 'light'],
    [null, true, 'dark'],
  ] as const)('stored %s with prefersDark %s resolves to %s', (stored, prefersDark, expected) => {
    expect(resolveTheme(stored, prefersDark)).toBe(expected);
  });
});

describe('applyTheme / readTheme', () => {
  it('writes data-theme and color-scheme and reads them back', () => {
    const root = document.createElement('html');

    applyTheme(root, 'dark');

    expect(root.dataset.theme).toBe('dark');
    expect(root.style.colorScheme).toBe('dark');
    expect(readTheme(root)).toBe('dark');
  });

  it('reads light when the attribute is missing or invalid', () => {
    const root = document.createElement('html');
    expect(readTheme(root)).toBe('light');

    root.dataset.theme = 'nope';
    expect(readTheme(root)).toBe('light');
  });

  it('exposes the storage key', () => {
    expect(THEME_STORAGE_KEY).toBe('carbonbox-theme');
  });
});
