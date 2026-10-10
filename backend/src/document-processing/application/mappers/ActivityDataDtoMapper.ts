import type { ActivityData } from '../../domain/entities/ActivityData.js';
import type { ActivityDataDto } from '../dtos/ActivityDataDtos.js';

export const ActivityDataDtoMapper = {
  toDto(row: ActivityData): ActivityDataDto {
    return {
      id: row.id,
      rowNumber: row.rowNumber,
      category: row.category.value,
      amount: row.amount.value,
      unit: row.unit.value,
      date: row.date.toISODate(),
    };
  },
};
