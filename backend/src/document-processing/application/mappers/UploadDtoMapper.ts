import type { RowError } from '../../domain/entities/RowError.js';
import type { Upload } from '../../domain/entities/Upload.js';
import type { RowErrorDto, UploadDto, UploadSummaryDto } from '../dtos/UploadDtos.js';

function toRowErrorDto(error: RowError): RowErrorDto {
  return {
    row: error.row,
    ...(error.field === undefined ? {} : { field: error.field }),
    code: error.code,
    message: error.message,
    ...(error.value === undefined ? {} : { value: error.value }),
  };
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
      errorCode: upload.errorCode,
      errorDetails: upload.errorDetails,
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
