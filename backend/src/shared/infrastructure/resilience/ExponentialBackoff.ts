export interface BackoffOptions {
  baseMs: number;
  factor: number;
  maxMs: number;
  /** Returns a value in [0, 1). Defaults to Math.random; injected in tests. */
  random?: () => number;
}

/** Exponential backoff with "equal jitter": half of the capped delay is fixed, half is random. */
export class ExponentialBackoff {
  private currentAttempt = 0;
  private readonly random: () => number;

  constructor(private readonly options: BackoffOptions) {
    this.random = options.random ?? Math.random;
  }

  /** cap = min(maxMs, baseMs * factor^attempt); returns floor(cap/2 + random() * cap/2); increments attempt. */
  nextDelayMs(): number {
    const { baseMs, factor, maxMs } = this.options;
    const cap = Math.min(maxMs, baseMs * factor ** this.currentAttempt);
    this.currentAttempt += 1;
    return Math.floor(cap / 2 + (this.random() * cap) / 2);
  }

  reset(): void {
    this.currentAttempt = 0;
  }

  get attempt(): number {
    return this.currentAttempt;
  }
}

/** Resolves after ms, or immediately (resolves, never rejects) when signal aborts. Clears the timer. */
export const sleep = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve) => {
    if (signal?.aborted === true) {
      resolve();
      return;
    }
    const onAbort = (): void => {
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
