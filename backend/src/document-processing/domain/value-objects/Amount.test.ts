import { describe, expect, it } from 'vitest';
import { Amount } from './Amount.js';

describe('Amount', () => {
  it('accepts "150.5", 200, "0.0001"', () => {
    const cases: [unknown, number][] = [
      ['150.5', 150.5],
      [200, 200],
      ['0.0001', 0.0001],
    ];
    for (const [raw, expected] of cases) {
      const result = Amount.create(raw);
      expect(result.isRight()).toBe(true);
      if (result.isRight()) expect(result.value.value).toBe(expected);
    }
  });

  it('rejects "-5", "abc", "1e3", "1,5", "1.23456", "0", "", undefined', () => {
    for (const raw of ['-5', 'abc', '1e3', '1,5', '1.23456', '0', '', undefined]) {
      const result = Amount.create(raw);
      expect(result.isLeft(), `expected ${String(raw)} to be rejected`).toBe(true);
      if (result.isLeft()) expect(result.value.fieldErrors[0]?.field).toBe('amount');
    }
  });

  it('reports the documented messages', () => {
    const message = (raw: unknown): string | undefined => {
      const result = Amount.create(raw);
      return result.isLeft() ? result.value.message : undefined;
    };
    expect(message('')).toBe('amount is required');
    expect(message('abc')).toBe('amount must be a positive number with at most 4 decimals');
    expect(message('0.0')).toBe('amount must be greater than 0');
  });

  it('uses the given field name', () => {
    const result = Amount.create('abc', 'quantity');
    expect(result.isLeft() && result.value.fieldErrors[0]?.field).toBe('quantity');
  });

  it('toString returns the normalized string', () => {
    const result = Amount.create(' 150.5 ');
    expect(result.isRight() && result.value.toString()).toBe('150.5');
    const fromNumber = Amount.create(200);
    expect(fromNumber.isRight() && fromNumber.value.toString()).toBe('200');
  });
});
