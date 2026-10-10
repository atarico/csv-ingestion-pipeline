import { Either } from '../../../shared/domain/Either.js';
import { ValidationError } from '../../../shared/domain/DomainError.js';
import { ValueObject } from '../../../shared/domain/ValueObject.js';

export class Unit extends ValueObject<{ value: string }> {
  static readonly MAX_LENGTH = 20;

  private constructor(value: string) {
    super({ value });
  }

  static create(raw: unknown, field = 'unit'): Either<ValidationError, Unit> {
    const fail = (message: string): Either<ValidationError, never> =>
      Either.left(new ValidationError(message, [{ field, message }]));

    const value = typeof raw === 'string' ? raw.trim() : '';
    if (value.length === 0) return fail(`${field} is required`);
    if (value.length > Unit.MAX_LENGTH)
      return fail(`${field} must be at most ${Unit.MAX_LENGTH} characters`);
    return Either.right(new Unit(value));
  }

  get value(): string {
    return this.props.value;
  }
}
