import type { ActivityData as ActivityDataRecord } from '../../../../generated/prisma/client.js';
import type { Either } from '../../../../shared/domain/Either.js';
import { ActivityData } from '../../../domain/entities/ActivityData.js';
import { ActivityDate } from '../../../domain/value-objects/ActivityDate.js';
import { Amount } from '../../../domain/value-objects/Amount.js';
import { Category } from '../../../domain/value-objects/Category.js';
import { Unit } from '../../../domain/value-objects/Unit.js';

/** Insert shape: `amount` travels as a decimal string to keep precision. */
export type ActivityDataPersistence = Omit<ActivityDataRecord, 'amount'> & { amount: string };

function unwrap<L, R>(result: Either<L, R>, field: string): R {
  if (result.isLeft()) throw new Error(`Corrupted ${field} in database`);
  return result.value;
}

export const PrismaActivityDataMapper = {
  toDomain(record: ActivityDataRecord): ActivityData {
    // Persisted values were validated on write; a failure here means corrupted data.
    const category = unwrap(Category.create(record.category), 'category');
    const amount = unwrap(Amount.create(record.amount.toNumber()), 'amount');
    const unit = unwrap(Unit.create(record.unit), 'unit');
    return ActivityData.reconstitute(record.id, {
      uploadId: record.uploadId,
      rowNumber: record.rowNumber,
      category,
      amount,
      unit,
      date: ActivityDate.fromDate(record.date),
      createdAt: record.createdAt,
    });
  },

  toPersistence(row: ActivityData): ActivityDataPersistence {
    return {
      id: row.id,
      uploadId: row.uploadId,
      rowNumber: row.rowNumber,
      category: row.category.value,
      amount: row.amount.toString(),
      unit: row.unit.value,
      date: row.date.toDate(),
      createdAt: row.createdAt,
    };
  },
};
