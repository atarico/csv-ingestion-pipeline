import type { RowError } from '../../domain/entities/RowError.js';
import type { Upload } from '../../domain/entities/Upload.js';
import type { RowErrorDto, UploadDto, UploadSummaryDto } from '../dtos/UploadDtos.js';

function toRowErrorDto(error: RowError): RowErrorDto {
  return error.field === undefined
    ? { row: error.row, message: error.message }
    : { row: error.row, field: error.field, message: error.message };
}

export const UploadDtoMapper = {
  toDto(upload: Upload): UploadDto {
    return {
      id: upload.id,
      fileName: upload.fileName.value,
      status: upload.status.value,
      totalRows: upload.totalRows,
      processedRows: upload.processedRows,
      failedRows: upload.failedRows,
      errorMessage: upload.errorMessage,
      rowErrors: upload.rowErrors.map(toRowErrorDto),
      createdAt: upload.createdAt.toISOString(),
      updatedAt: upload.updatedAt.toISOString(),
    };
  },

  toSummary(upload: Upload): UploadSummaryDto {
    return {
      id: upload.id,
      fileName: upload.fileName.value,
      status: upload.status.value,
      totalRows: upload.totalRows,
      processedRows: upload.processedRows,
      failedRows: upload.failedRows,
      createdAt: upload.createdAt.toISOString(),
    };
  },
};
