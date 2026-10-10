import { describe, expect, it } from 'vitest';
import { Category } from './Category.js';
import { Unit } from './Unit.js';

describe('Category', () => {
  it('accepts "Electricity"', () => {
    const result = Category.create('Electricity');
    expect(result.isRight() && result.value.value).toBe('Electricity');
  });

  it('trims', () => {
    const result = Category.create('  Electricity  ');
    expect(result.isRight() && result.value.value).toBe('Electricity');
  });

  it('rejects empty, non-string and undefined', () => {
    for (const raw of ['', '   ', 5, undefined]) {
      const result = Category.create(raw);
      expect(result.isLeft()).toBe(true);
      if (result.isLeft()) {
        expect(result.value.message).toBe('category is required');
        expect(result.value.fieldErrors[0]?.field).toBe('category');
      }
    }
  });

  it('rejects 101 chars', () => {
    const result = Category.create('a'.repeat(101));
    expect(result.isLeft() && result.value.message).toBe('category must be at most 100 characters');
    expect(Category.create('a'.repeat(100)).isRight()).toBe(true);
  });

  it('rejects control characters', () => {
    const result = Category.create('Electri\u0000city');
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.message).toBe('must not contain control characters');
      expect(result.value.fieldErrors[0]).toEqual({
        field: 'category',
        message: 'must not contain control characters',
      });
    }
  });
});

describe('Unit', () => {
  it('accepts "kWh"', () => {
    const result = Unit.create('kWh');
    expect(result.isRight() && result.value.value).toBe('kWh');
  });

  it('rejects 21 chars', () => {
    const result = Unit.create('u'.repeat(21));
    expect(result.isLeft() && result.value.message).toBe('unit must be at most 20 characters');
    expect(Unit.create('u'.repeat(20)).isRight()).toBe(true);
  });

  it('rejects control characters', () => {
    const result = Unit.create('k\u0007Wh');
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.message).toBe('must not contain control characters');
      expect(result.value.fieldErrors[0]?.field).toBe('unit');
    }
  });

  it('rejects empty with the field name', () => {
    const result = Unit.create('', 'measure');
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.message).toBe('measure is required');
      expect(result.value.fieldErrors[0]?.field).toBe('measure');
    }
  });
});
