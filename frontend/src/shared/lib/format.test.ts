import { describe, expect, it } from 'vitest';
import { formatBytes, formatDateTime, formatNumber, formatRelativeTime } from './format';

describe('format', () => {
  it('formatDateTime renders dd/MM/yyyy HH:mm', () => {
    expect(formatDateTime('2024-01-15T10:30:00.000Z')).toBe('15/01/2024 10:30');
  });

  it('formatDateTime zero-pads day, month, hours and minutes', () => {
    expect(formatDateTime('2024-03-05T04:07:00.000Z')).toBe('05/03/2024 04:07');
  });

  it('formatNumber keeps up to four decimals', () => {
    expect(formatNumber(12345.67891)).toBe('12.345,6789');
  });

  it('formatNumber groups 4-digit numbers like larger ones', () => {
    expect(formatNumber(9000)).toBe('9.000');
    expect(formatNumber(10000)).toBe('10.000');
    expect(formatNumber(999)).toBe('999');
  });

  it('formatBytes uses 1024 base, es locale and one decimal', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(999)).toBe('999 B');
    expect(formatBytes(12595)).toBe('12,3 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5 MB');
  });

  describe('formatRelativeTime', () => {
    const now = new Date('2024-06-15T12:00:00.000Z');
    const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();
    const MIN = 60_000;
    const HOUR = 60 * MIN;
    const DAY = 24 * HOUR;

    it('says "ahora" for the last seconds', () => {
      expect(formatRelativeTime(ago(20_000), now)).toBe('ahora');
    });

    it('uses minutes, hours and days in Spanish', () => {
      expect(formatRelativeTime(ago(5 * MIN), now)).toBe('hace 5 minutos');
      expect(formatRelativeTime(ago(2 * HOUR), now)).toBe('hace 2 horas');
      expect(formatRelativeTime(ago(DAY), now)).toBe('ayer');
      expect(formatRelativeTime(ago(3 * DAY), now)).toBe('hace 3 días');
    });

    it('falls back to months and years for old dates', () => {
      expect(formatRelativeTime(ago(65 * DAY), now)).toBe('hace 2 meses');
      expect(formatRelativeTime(ago(800 * DAY), now)).toBe('hace 2 años');
    });

    it('treats future timestamps (clock skew) as now', () => {
      expect(formatRelativeTime(new Date(now.getTime() + 5 * MIN).toISOString(), now)).toBe('ahora');
    });
  });
});
