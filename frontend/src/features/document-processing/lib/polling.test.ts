import { describe, expect, it } from 'vitest';
import { getPollingInterval, POLLING_INTERVAL_MS } from './polling';

describe('getPollingInterval', () => {
  it('returns 3000 for PENDING and PROCESSING', () => {
    expect(POLLING_INTERVAL_MS).toBe(3000);
    expect(getPollingInterval('PENDING')).toBe(3000);
    expect(getPollingInterval('PROCESSING')).toBe(3000);
  });

  it('returns false for COMPLETED, FAILED and undefined', () => {
    expect(getPollingInterval('COMPLETED')).toBe(false);
    expect(getPollingInterval('FAILED')).toBe(false);
    expect(getPollingInterval(undefined)).toBe(false);
  });
});
