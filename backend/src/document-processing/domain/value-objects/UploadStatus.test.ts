import { describe, expect, it } from 'vitest';
import { UploadStatus, UPLOAD_STATUS_VALUES } from './UploadStatus.js';

describe('UploadStatus', () => {
  it('fromValue accepts the four values', () => {
    for (const raw of UPLOAD_STATUS_VALUES) {
      const result = UploadStatus.fromValue(raw);
      expect(result.isRight()).toBe(true);
      if (result.isRight()) expect(result.value.value).toBe(raw);
    }
  });

  it('fromValue rejects "DONE"', () => {
    const result = UploadStatus.fromValue('DONE');
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.code).toBe('VALIDATION_ERROR');
      expect(result.value.fieldErrors[0]?.field).toBe('status');
    }
  });

  it('isTerminal is true only for COMPLETED and FAILED', () => {
    expect(UploadStatus.PENDING.isTerminal()).toBe(false);
    expect(UploadStatus.PROCESSING.isTerminal()).toBe(false);
    expect(UploadStatus.COMPLETED.isTerminal()).toBe(true);
    expect(UploadStatus.FAILED.isTerminal()).toBe(true);
  });

  it('fromValue returns the shared singleton instances', () => {
    const result = UploadStatus.fromValue('PENDING');
    expect(result.isRight() && result.value === UploadStatus.PENDING).toBe(true);
  });

  it.each([
    ['PENDING', 'PROCESSING'],
    ['PENDING', 'FAILED'],
    ['PROCESSING', 'PROCESSING'],
    ['PROCESSING', 'COMPLETED'],
    ['PROCESSING', 'FAILED'],
  ] as const)('allows %s -> %s', (from, to) => {
    expect(UploadStatus[from].canTransitionTo(UploadStatus[to])).toBe(true);
  });

  it('forbids PENDING -> COMPLETED, COMPLETED -> PROCESSING and FAILED -> PENDING', () => {
    expect(UploadStatus.PENDING.canTransitionTo(UploadStatus.COMPLETED)).toBe(false);
    expect(UploadStatus.COMPLETED.canTransitionTo(UploadStatus.PROCESSING)).toBe(false);
    expect(UploadStatus.FAILED.canTransitionTo(UploadStatus.PENDING)).toBe(false);
  });
});
