import { Either } from '../../../shared/domain/Either.js';
import { ValidationError, type FieldErrorCode } from '../../../shared/domain/DomainError.js';
import { ValueObject } from '../../../shared/domain/ValueObject.js';

export class Amount extends ValueObject<{ value: number; raw: string }> {
  static readonly PATTERN = /^\d{1,10}(\.\d{1,4})?$/;

  private constructor(value: number, raw: string) {
    super({ value, raw });
  }

  static create(raw: unknown, field = 'amount'): Either<ValidationError, Amount> {
    const fail = (code: FieldErrorCode, message: string): Either<ValidationError, never> =>
      Either.left(new ValidationError(message, [{ field, message, code }]));

    let text: string;
    if (typeof raw === 'number') text = String(raw);
    else if (typeof raw === 'string') text = raw;
    else return fail('REQUIRED', `${field} is required`);

    text = text.trim();
    if (text.length === 0) return fail('REQUIRED', `${field} is required`);
    if (!Amount.PATTERN.test(text))
      return fail('INVALID_NUMBER', `${field} must be a positive number with at most 4 decimals`);
    const value = Number(text);
    if (value <= 0) return fail('NOT_POSITIVE', `${field} must be greater than 0`);
    return Either.right(new Amount(value, text));
  }

  get value(): number {
    return this.props.value;
  }

  /** Normalized decimal string, e.g. "150.5"; used for Decimal persistence. */
  override toString(): string {
    return this.props.raw;
  }
}
