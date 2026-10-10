import { describe, expect, it } from 'vitest';
import { Either } from './Either.js';

describe('Either', () => {
  it('left exposes value and type guards', () => {
    const result = Either.left<number, string>(1);
    expect(result.isLeft()).toBe(true);
    expect(result.isRight()).toBe(false);
    expect(result.value).toBe(1);
  });

  it('right exposes value and type guards', () => {
    const result = Either.right<string, number>('ok');
    expect(result.isRight()).toBe(true);
    expect(result.isLeft()).toBe(false);
    expect(result.value).toBe('ok');
  });

  it('fold calls the matching branch', () => {
    expect(
      Either.fold(
        Either.left<number, number>(1),
        (l) => l * 2,
        () => 0,
      ),
    ).toBe(2);
    expect(
      Either.fold(
        Either.right<number, number>(3),
        () => 0,
        (r) => r + 1,
      ),
    ).toBe(4);
  });

  it('type guard narrows value (compile-time)', () => {
    const compute = (input: number): Either<Error, number> =>
      input > 0 ? Either.right(input) : Either.left(new Error('non-positive'));

    const result = compute(5);
    if (result.isRight()) {
      const value: number = result.value;
      expect(value).toBe(5);
    } else {
      throw new Error('expected a right');
    }
  });
});
