export interface WorkerPolicy {
  /** Must equal the queue RedrivePolicy maxReceiveCount (3). */
  maxReceiveCount: number;
  /** Cap for the receive-failure backoff. */
  pollBackoffMaxMs: number;
  /** Per-message retry: first delay (15). */
  retryBackoffBaseSeconds: number;
  /** Per-message retry: cap (60). */
  retryBackoffMaxSeconds: number;
  /** For the startup log only. */
  sqsQueueUrl: string;
  /** Injected in tests; defaults to Math.random. */
  random?: () => number;
  /** Injected in tests; defaults to the real sleep. */
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
}
