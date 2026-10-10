import { describe, expect, it } from 'vitest';
import { formatDateTime, formatNumber } from './format';

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
});
