import { describe, expect, it } from 'vitest';
import { ActivityData } from './ActivityData.js';

const valid = {
  uploadId: 'upload-1',
  rowNumber: 3,
  category: 'Electricity',
  amount: '150.5',
  unit: 'kWh',
  date: '2024-01-15',
};

describe('ActivityData', () => {
  it('creates with valid input', () => {
    const result = ActivityData.create(valid);
    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      const row = result.value;
      expect(row.uploadId).toBe('upload-1');
      expect(row.rowNumber).toBe(3);
      expect(row.category.value).toBe('Electricity');
      expect(row.amount.toString()).toBe('150.5');
      expect(row.unit.value).toBe('kWh');
      expect(row.date.toISODate()).toBe('2024-01-15');
      expect(row.createdAt).toBeInstanceOf(Date);
      expect(row.id).toMatch(/^[0-9a-f-]{36}$/);
    }
  });

  it('collects errors from every invalid field', () => {
    const result = ActivityData.create({ ...valid, category: '', amount: '-1', date: 'nope' });
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.message).toBe('Invalid activity data row');
      expect(result.value.fieldErrors.map((e) => e.field)).toEqual(['category', 'amount', 'date']);
    }
  });

  it('generates distinct ids', () => {
    const a = ActivityData.create(valid);
    const b = ActivityData.create(valid);
    expect(a.isRight() && b.isRight() && a.value.id !== b.value.id).toBe(true);
  });

  it('reconstitute keeps the given id and props', () => {
    const created = ActivityData.create(valid);
    if (created.isLeft()) throw new Error('expected a right');
    const row = created.value;
    const restored = ActivityData.reconstitute('fixed-id', {
      uploadId: row.uploadId,
      rowNumber: row.rowNumber,
      category: row.category,
      amount: row.amount,
      unit: row.unit,
      date: row.date,
      createdAt: row.createdAt,
    });
    expect(restored.id).toBe('fixed-id');
    expect(restored.createdAt).toBe(row.createdAt);
  });
});
