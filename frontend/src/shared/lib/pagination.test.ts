import { describe, expect, it } from 'vitest';
import { parsePageParam } from './pagination';

describe('parsePageParam', () => {
  it.each([
    [undefined, 1],
    ['', 1],
    ['abc', 1],
    ['0', 1],
    ['-4', 1],
    ['2.9', 2],
    ['3', 3],
    ['Infinity', 100000],
    ['999999999', 100000],
  ])('maps %j to %i', (raw, expected) => {
    expect(parsePageParam(raw)).toBe(expected);
  });
});
