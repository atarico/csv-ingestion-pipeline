import { describe, expect, it } from 'vitest';
import { ActivityDate } from './ActivityDate.js';

describe('ActivityDate', () => {
  it('accepts "2024-01-15" and leap day "2024-02-29"', () => {
    for (const raw of ['2024-01-15', '2024-02-29']) {
      const result = ActivityDate.create(raw);
      expect(result.isRight()).toBe(true);
      if (result.isRight()) expect(result.value.toISODate()).toBe(raw);
    }
  });

  it('rejects "2024-02-30", "2023-02-29", "2024-13-01", "15/01/2024", "2024-1-5", undefined', () => {
    for (const raw of [
      '2024-02-30',
      '2023-02-29',
      '2024-13-01',
      '15/01/2024',
      '2024-1-5',
      undefined,
    ]) {
      const result = ActivityDate.create(raw);
      expect(result.isLeft(), `expected ${String(raw)} to be rejected`).toBe(true);
      if (result.isLeft()) expect(result.value.fieldErrors[0]?.field).toBe('date');
    }
  });

  it('reports the documented messages', () => {
    const message = (raw: unknown): string | undefined => {
      const result = ActivityDate.create(raw);
      return result.isLeft() ? result.value.message : undefined;
    };
    expect(message('  ')).toBe('date is required');
    expect(message('15/01/2024')).toBe('date must use the format YYYY-MM-DD');
    expect(message('2024-02-30')).toBe('date is not a valid calendar date');
  });

  it('toDate is UTC midnight', () => {
    const result = ActivityDate.create('2024-01-15');
    expect(result.isRight() && result.value.toDate().toISOString()).toBe(
      '2024-01-15T00:00:00.000Z',
    );
  });

  it('fromDate round-trips', () => {
    const date = new Date(Date.UTC(2024, 1, 29, 23, 59, 59));
    const activityDate = ActivityDate.fromDate(date);
    expect(activityDate.toISODate()).toBe('2024-02-29');
    expect(activityDate.toDate().toISOString()).toBe('2024-02-29T00:00:00.000Z');
  });
});
