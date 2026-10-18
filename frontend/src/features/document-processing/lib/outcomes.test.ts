import { describe, expect, it } from 'vitest';
import type { UploadStatsDto } from '../types/upload.types';
import { OUTCOMES, distributionOf, getOutcome, shareOf } from './outcomes';

const stats: UploadStatsDto = {
  total: 20,
  pending: 1,
  processing: 1,
  completed: 14,
  failed: 4,
  completedWithRowErrors: 5,
};

describe('outcomes', () => {
  it('lists the four outcomes in display order', () => {
    expect(OUTCOMES.map((outcome) => outcome.key)).toEqual(['all', 'correct', 'withProblems', 'failed']);
  });

  it('counts every outcome from the stats', () => {
    expect(getOutcome('all').countFor(stats)).toBe(20);
    expect(getOutcome('correct').countFor(stats)).toBe(9);
    expect(getOutcome('withProblems').countFor(stats)).toBe(5);
    expect(getOutcome('failed').countFor(stats)).toBe(4);
  });

  it('never reports a negative number of correct uploads', () => {
    expect(getOutcome('correct').countFor({ ...stats, completed: 2, completedWithRowErrors: 5 })).toBe(0);
  });

  it('maps each outcome to the list filter the API understands', () => {
    expect(getOutcome('all').filter).toEqual({});
    expect(getOutcome('correct').filter).toEqual({ status: 'COMPLETED', hasRowErrors: false });
    expect(getOutcome('withProblems').filter).toEqual({ status: 'COMPLETED', hasRowErrors: true });
    expect(getOutcome('failed').filter).toEqual({ status: 'FAILED' });
  });

  it('gives each outcome its own tone and empty-state wording', () => {
    expect(OUTCOMES.map((outcome) => outcome.tone)).toEqual(['primary', 'accent', 'warning', 'danger']);
    expect(getOutcome('withProblems').emptyMessage).toBe('Todavía no hay cargas con problemas.');
  });

  describe('shareOf', () => {
    it('returns a rounded percentage', () => {
      expect(shareOf(1, 3)).toBe(33);
      expect(shareOf(2, 3)).toBe(67);
    });

    it('returns 0 when the whole is zero', () => {
      expect(shareOf(0, 0)).toBe(0);
      expect(shareOf(5, 0)).toBe(0);
    });
  });

  describe('distributionOf', () => {
    it('splits finished uploads into correct, with problems and failed', () => {
      expect(distributionOf(stats)).toEqual({ correct: 9, withProblems: 5, failed: 4, total: 18 });
    });

    it('is empty when nothing has finished yet', () => {
      const empty = { ...stats, total: 2, completed: 0, failed: 0, completedWithRowErrors: 0 };
      expect(distributionOf(empty).total).toBe(0);
    });
  });
});
