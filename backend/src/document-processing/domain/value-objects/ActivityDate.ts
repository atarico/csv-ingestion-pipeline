import { Either } from '../../../shared/domain/Either.js';
import { ValidationError } from '../../../shared/domain/DomainError.js';
import { ValueObject } from '../../../shared/domain/ValueObject.js';

export class ActivityDate extends ValueObject<{ value: string }> {
  static readonly PATTERN = /^\d{4}-\d{2}-\d{2}$/;

  private constructor(value: string) {
    super({ value });
  }

  static create(raw: unknown, field = 'date'): Either<ValidationError, ActivityDate> {
    const fail = (message: string): Either<ValidationError, never> =>
      Either.left(new ValidationError(message, [{ field, message }]));

    if (typeof raw !== 'string' || raw.trim().length === 0) return fail(`${field} is required`);
    const text = raw.trim();
    if (!ActivityDate.PATTERN.test(text)) return fail(`${field} must use the format YYYY-MM-DD`);

    const [year = 0, month = 0, day = 0] = text.split('-').map(Number);
    const built = new Date(Date.UTC(year, month - 1, day));
    const isRealDate =
      built.getUTCFullYear() === year &&
      built.getUTCMonth() === month - 1 &&
      built.getUTCDate() === day;
    if (!isRealDate) return fail(`${field} is not a valid calendar date`);
    return Either.right(new ActivityDate(text));
  }

  /** Uses UTC components; used by mappers. */
  static fromDate(date: Date): ActivityDate {
    const year = String(date.getUTCFullYear()).padStart(4, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return new ActivityDate(`${year}-${month}-${day}`);
  }

  /** "YYYY-MM-DD" */
  toISODate(): string {
    return this.props.value;
  }

  /** Date at 00:00:00.000 UTC */
  toDate(): Date {
    const [year = 0, month = 0, day = 0] = this.props.value.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }
}
