import { describe, expect, it } from 'vitest';
import { InMemoryMessageQueue } from './InMemoryMessageQueue.js';

describe('InMemoryMessageQueue', () => {
  it('receive increments receiveCount and requeueInFlight redelivers', async () => {
    const queue = new InMemoryMessageQueue();
    await queue.publish({ uploadId: 'u1' });
    expect(queue.published).toEqual([{ uploadId: 'u1' }]);
    expect(queue.pendingCount).toBe(1);

    const first = await queue.receive();
    expect(first).toHaveLength(1);
    expect(first[0]?.receiveCount).toBe(1);
    expect(first[0]?.body).toEqual({ uploadId: 'u1' });
    expect(queue.pendingCount).toBe(0);
    expect(queue.inFlightCount).toBe(1);
    expect(await queue.receive()).toEqual([]);

    queue.requeueInFlight();
    const second = await queue.receive();
    expect(second[0]?.receiveCount).toBe(2);
    expect(second[0]?.receiptHandle).toBe(first[0]?.receiptHandle);

    await queue.delete(second[0]?.receiptHandle ?? '');
    expect(queue.inFlightCount).toBe(0);
    expect(queue.published).toHaveLength(1);
  });

  it('changeVisibility records the last value', async () => {
    const queue = new InMemoryMessageQueue();
    expect(queue.lastVisibilityChange).toBeNull();

    await queue.changeVisibility('handle-1', 30);
    await queue.changeVisibility('handle-1', 15);

    expect(queue.lastVisibilityChange).toEqual({ receiptHandle: 'handle-1', timeoutSeconds: 15 });
    expect(queue.visibilityChanges).toHaveLength(2);
  });

  it('receives at most maxMessages per call', async () => {
    const queue = new InMemoryMessageQueue(2);
    for (let i = 0; i < 3; i += 1) await queue.publish({ i });

    expect(await queue.receive()).toHaveLength(2);
    expect(queue.pendingCount).toBe(1);
  });

  it('failNextPublish returns a Left once and failNextReceive throws once', async () => {
    const queue = new InMemoryMessageQueue();
    queue.failNextPublish = true;
    expect((await queue.publish({ a: 1 })).isLeft()).toBe(true);
    expect((await queue.publish({ a: 1 })).isRight()).toBe(true);

    queue.failNextReceive = true;
    await expect(queue.receive()).rejects.toThrow();
    expect(await queue.receive()).toHaveLength(1);
  });
});
