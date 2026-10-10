import { ValidationError, type FieldError } from '../../../shared/domain/DomainError.js';
import { Either } from '../../../shared/domain/Either.js';
import { Entity } from '../../../shared/domain/Entity.js';
import { UniqueId } from '../../../shared/domain/UniqueId.js';
import { ActivityDate } from '../value-objects/ActivityDate.js';
import { Amount } from '../value-objects/Amount.js';
import { Category } from '../value-objects/Category.js';
import { Unit } from '../value-objects/Unit.js';

export interface ActivityDataProps {
  uploadId: string;
  rowNumber: number;
  category: Category;
  amount: Amount;
  unit: Unit;
  date: ActivityDate;
  createdAt: Date;
}

export interface CreateActivityDataInput {
  uploadId: string;
  rowNumber: number;
  category: unknown;
  amount: unknown;
  unit: unknown;
  date: unknown;
}

export class ActivityData extends Entity<ActivityDataProps> {
  static create(input: CreateActivityDataInput): Either<ValidationError, ActivityData> {
    const category = Category.create(input.category);
    const amount = Amount.create(input.amount);
    const unit = Unit.create(input.unit);
    const date = ActivityDate.create(input.date);

    if (category.isLeft() || amount.isLeft() || unit.isLeft() || date.isLeft()) {
      const fieldErrors: FieldError[] = [];
      for (const result of [category, amount, unit, date]) {
        if (result.isLeft()) fieldErrors.push(...result.value.fieldErrors);
      }
      return Either.left(new ValidationError('Invalid activity data row', fieldErrors));
    }

    return Either.right(
      new ActivityData(UniqueId.generate(), {
        uploadId: input.uploadId,
        rowNumber: input.rowNumber,
        category: category.value,
        amount: amount.value,
        unit: unit.value,
        date: date.value,
        createdAt: new Date(),
      }),
    );
  }

  static reconstitute(id: string, props: ActivityDataProps): ActivityData {
    return new ActivityData(id, props);
  }

  get uploadId(): string {
    return this.props.uploadId;
  }
  get rowNumber(): number {
    return this.props.rowNumber;
  }
  get category(): Category {
    return this.props.category;
  }
  get amount(): Amount {
    return this.props.amount;
  }
  get unit(): Unit {
    return this.props.unit;
  }
  get date(): ActivityDate {
    return this.props.date;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
}
