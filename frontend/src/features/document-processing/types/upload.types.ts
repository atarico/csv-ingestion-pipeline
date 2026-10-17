// Mirror of backend/src/document-processing/application/dtos (document 04).
export type UploadStatusValue = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface RowErrorDto { row: number; field?: string; code: string; message: string; value?: string }

export interface UploadDto {
  id: string; fileName: string; status: UploadStatusValue;
  totalRows: number | null; processedRows: number | null; failedRows: number | null;
  errorMessage: string | null; errorCode: string | null; errorDetails: Record<string, unknown> | null;
  rowErrors: RowErrorDto[];
  createdAt: string; updatedAt: string;
}

export interface UploadSummaryDto {
  id: string; fileName: string; status: UploadStatusValue;
  totalRows: number | null; processedRows: number | null; failedRows: number | null;
  createdAt: string;
}

export interface CreateUploadResult { id: string; status: UploadStatusValue; fileName: string; createdAt: string }

export interface ActivityDataDto { id: string; rowNumber: number; category: string; amount: number; unit: string; date: string }

export interface PaginatedDto<T> { data: T[]; total: number; page: number; limit: number; totalPages: number }

export interface UploadStatsDto { total: number; pending: number; processing: number; completed: number; failed: number; completedWithRowErrors: number }

export interface ApiErrorBody { error: { code: string; message: string; details?: unknown }; requestId: string }
