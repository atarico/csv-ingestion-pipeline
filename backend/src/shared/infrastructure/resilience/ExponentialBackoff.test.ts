import { describe, expect, it } from 'vitest';
import { ExponentialBackoff } from './ExponentialBackoff.js';

describe('ExponentialBackoff', () => {
  const options = { baseMs: 1000, factor: 2, maxMs: 30000 };

  it('delays follow 500,1000,2000,4000 with random=0', () => {
    const backoff = new ExponentialBackoff({ ...options, random: () => 0 });

    const delays = [
      backoff.nextDelayMs(),
      backoff.nextDelayMs(),
      backoff.nextDelayMs(),
      backoff.nextDelayMs(),
    ];

    expect(delays).toEqual([500, 1000, 2000, 4000]);
    expect(backoff.attempt).toBe(4);
  });

  it('caps at maxMs/2..maxMs', () => {
    const high = new ExponentialBackoff({ ...options, random: () => 1 });
    const low = new ExponentialBackoff({ ...options, random: () => 0 });
    let highDelay = 0;
    let lowDelay = 0;

    for (let index = 0; index < 20; index += 1) {
      highDelay = high.nextDelayMs();
      lowDelay = low.nextDelayMs();
    }

    expect(highDelay).toBe(30000);
    expect(lowDelay).toBe(15000);
  });

  it('reset restarts the sequence', () => {
    const backoff = new ExponentialBackoff({ ...options, random: () => 0 });
    backoff.nextDelayMs();
    backoff.nextDelayMs();

    backoff.reset();

    expect(backoff.attempt).toBe(0);
    expect(backoff.nextDelayMs()).toBe(500);
  });
});
