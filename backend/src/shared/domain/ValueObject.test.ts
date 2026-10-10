import { describe, expect, it } from 'vitest';
import { ValueObject } from './ValueObject.js';

class Money extends ValueObject<{ amount: number; currency: string }> {
  constructor(amount: number, currency: string) {
    super({ amount, currency });
  }
  get amount(): number {
    return this.props.amount;
  }
  tryMutate(): void {
    (this.props as { amount: number }).amount = 999;
  }
}

class Other extends ValueObject<{ amount: number; currency: string }> {
  constructor(amount: number, currency: string) {
    super({ amount, currency });
  }
}

describe('ValueObject', () => {
  it('equals is true for same props and same class', () => {
    expect(new Money(1, 'USD').equals(new Money(1, 'USD'))).toBe(true);
  });

  it('equals is false for different props, different class or undefined', () => {
    const money = new Money(1, 'USD');
    expect(money.equals(new Money(2, 'USD'))).toBe(false);
    expect(money.equals(new Other(1, 'USD') as unknown as Money)).toBe(false);
    expect(money.equals(undefined)).toBe(false);
  });

  it('props are frozen', () => {
    const money = new Money(1, 'USD');
    expect(() => money.tryMutate()).toThrow(TypeError);
    expect(money.amount).toBe(1);
  });
});
