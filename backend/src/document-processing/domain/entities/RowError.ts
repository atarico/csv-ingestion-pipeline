export interface RowError {
  /** 1-based data row number (header excluded). */
  row: number;
  /** Omitted when the whole row is affected. */
  field?: string;
  message: string;
}

export const MAX_STORED_ROW_ERRORS = 100;
