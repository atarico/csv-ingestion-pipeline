import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(__dirname, '../../styles/globals.css'), 'utf8');

type Tokens = Record<string, string>;

function parseBlock(selector: string): Tokens {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const block = new RegExp(`${escaped}\\s*\\{([^}]*)\\}`).exec(css);
  const tokens: Tokens = {};
  for (const match of (block?.[1] ?? '').matchAll(/--cb-([a-z-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    if (match[1] !== undefined && match[2] !== undefined) tokens[match[1]] = match[2];
  }
  return tokens;
}

function channel(hex: string, start: number): number {
  const value = parseInt(hex.slice(start, start + 2), 16) / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  return 0.2126 * channel(hex, 1) + 0.7152 * channel(hex, 3) + 0.0722 * channel(hex, 5);
}

function contrast(a: string, b: string): number {
  const lighter = Math.max(luminance(a), luminance(b));
  const darker = Math.min(luminance(a), luminance(b));
  return (lighter + 0.05) / (darker + 0.05);
}

function token(tokens: Tokens, name: string): string {
  const value = tokens[name];
  if (value === undefined) throw new Error(`missing token --cb-${name}`);
  return value;
}

const WHITE = '#ffffff';
const MIN_CONTRAST = 4.5;

const light: Tokens = parseBlock(':root');
const dark = parseBlock('[data-theme="dark"]');

const themes: [string, Tokens][] = [
  ['light', light],
  ['dark', dark],
];

const sharedPairs: Array<[string, string]> = [
  ['ink', 'bg'],
  ['ink', 'surface'],
  ['ink-muted', 'surface'],
  ['ink-muted', 'bg'],
  ['primary', 'surface'],
  ['accent', 'surface'],
  ['danger', 'danger-soft'],
  ['danger', 'surface'],
];

describe('design tokens', () => {
  it.each(themes)('defines the full token set in the %s theme', (_name, tokens) => {
    expect(Object.keys(tokens)).toHaveLength(20);
    expect(Object.keys(tokens).sort()).toEqual(Object.keys(light).sort());
  });

  it.each(themes)('keeps text pairs at WCAG AA in the %s theme', (_name, tokens) => {
    for (const [fg, bg] of sharedPairs) {
      expect(contrast(token(tokens, fg), token(tokens, bg)), `${fg} on ${bg}`).toBeGreaterThanOrEqual(MIN_CONTRAST);
    }
  });

  it('keeps white text on the accent button in the light theme', () => {
    expect(contrast(WHITE, token(light, 'accent'))).toBeGreaterThanOrEqual(MIN_CONTRAST);
  });

  it('keeps dark text on the accent button in the dark theme', () => {
    expect(contrast(token(dark, 'surface-dark'), token(dark, 'accent'))).toBeGreaterThanOrEqual(MIN_CONTRAST);
  });

  it.each(themes)('keeps white text on the navy header in the %s theme', (_name, tokens) => {
    expect(contrast(WHITE, token(tokens, 'surface-dark'))).toBeGreaterThanOrEqual(MIN_CONTRAST);
  });
});
