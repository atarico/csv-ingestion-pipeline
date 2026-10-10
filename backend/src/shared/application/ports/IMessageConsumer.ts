export interface ReceivedMessage {
  id: string;
  receiptHandle: string;
  body: unknown; // parsed JSON when possible, otherwise the raw string
  receiveCount: number; // 1 on first delivery
}
export interface IMessageConsumer {
  /**
   * May throw on transport failure; the worker loop is the catch boundary.
   * Aborting `signal` ends a long poll early; adapters resolve with no messages.
   */
  receive(signal?: AbortSignal): Promise<ReceivedMessage[]>;
  /** May throw on transport failure. */
  delete(receiptHandle: string): Promise<void>;
  /** Sets the message's visibility timeout (seconds) so a retry happens after a delay. May throw. */
  changeVisibility(receiptHandle: string, timeoutSeconds: number): Promise<void>;
}
