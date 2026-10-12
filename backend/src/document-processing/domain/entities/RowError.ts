import type { FieldErrorCode } from '../../../shared/domain/DomainError.js';

export interface RowError {
  /** 1-based data row number (header excluded). */
  row: number;
  /** Omitted when the whole row is affected. */
  field?: string;
  /** Machine-readable reason; `INVALID` when the validation produced no specific code. */
  code: FieldErrorCode | 'INVALID';
  message: string;
  /** The offending cell as read from the file: trimmed, at most 50 characters plus `…`. Omitted when empty. */
  value?: string;
}

export const MAX_STORED_ROW_ERRORS = 100;
/** Longest stored `RowError.value`; longer cells are cut and end with an ellipsis. */
export const MAX_ROW_ERROR_VALUE_LENGTH = 50;
