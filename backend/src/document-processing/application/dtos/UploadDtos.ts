import type { UploadStatusValue } from '../../domain/value-objects/UploadStatus.js';
export type { UploadStatusValue };

export interface RowErrorDto {
  row: number;
  field?: string;
  /** Machine-readable reason (a FieldErrorCode, or `INVALID`). */
  code: string;
  message: string;
  /** The offending cell, trimmed and truncated; omitted when empty. */
  value?: string;
}

export interface UploadDto {
  id: string;
  fileName: string;
  status: UploadStatusValue;
  totalRows: number | null;
  processedRows: number | null;
  failedRows: number | null;
  errorMessage: string | null;
  /** UploadFailureCode of a FAILED upload; null otherwise. */
  errorCode: string | null;
  errorDetails: Record<string, unknown> | null;
  rowErrors: RowErrorDto[];
  createdAt: string; // ISO 8601 UTC
  updatedAt: string; // ISO 8601 UTC
}

export interface UploadSummaryDto {
  id: string;
  fileName: string;
  status: UploadStatusValue;
  totalRows: number | null;
  processedRows: number | null;
  failedRows: number | null;
  createdAt: string;
}

export interface CreateUploadResult {
  id: string;
  status: UploadStatusValue;
  fileName: string;
  createdAt: string;
}

export interface ProcessFileResult {
  uploadId: string;
  status: UploadStatusValue; // COMPLETED or FAILED
  totalRows: number;
  processedRows: number;
  failedRows: number;
}

export interface PaginatedDto<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UploadStatsDto {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}
