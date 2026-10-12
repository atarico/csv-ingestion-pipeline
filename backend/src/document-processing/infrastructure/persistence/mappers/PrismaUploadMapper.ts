import * as z from 'zod';
import { Prisma, type Upload as UploadRecord } from '../../../../generated/prisma/client.js';
import { FIELD_ERROR_CODES } from '../../../../shared/domain/DomainError.js';
import { Upload, UPLOAD_FAILURE_CODES } from '../../../domain/entities/Upload.js';
import { FileName } from '../../../domain/value-objects/FileName.js';
import { UploadStatus } from '../../../domain/value-objects/UploadStatus.js';

const RowErrorsSchema = z.array(
  z.object({
    row: z.number().int(),
    field: z.string().optional(),
    // Records written before error codes existed carry no `code`; unknown codes degrade the same way.
    code: z.enum([...FIELD_ERROR_CODES, 'INVALID']).catch('INVALID'),
    message: z.string(),
    value: z.string().optional(),
  }),
);

const ErrorCodeSchema = z.enum(UPLOAD_FAILURE_CODES).nullable();
const ErrorDetailsSchema = z.record(z.string(), z.unknown()).nullable();

/**
 * Every column except `updatedAt`, which Prisma maintains (`@updatedAt`); `rowErrors` is always an array
 * and `errorDetails` uses `Prisma.DbNull` because Prisma rejects a plain `null` for Json input.
 */
export type UploadPersistence = Omit<UploadRecord, 'updatedAt' | 'rowErrors' | 'errorDetails'> & {
  rowErrors: Prisma.InputJsonArray;
  errorDetails: Prisma.InputJsonValue | typeof Prisma.DbNull;
};

export const PrismaUploadMapper = {
  toDomain(record: UploadRecord): Upload {
    const fileName = FileName.create(record.fileName);
    if (fileName.isLeft()) throw new Error('Corrupted fileName in database');
    const status = UploadStatus.fromValue(record.status);
    if (status.isLeft()) throw new Error('Corrupted status in database');

    const parsedRowErrors = RowErrorsSchema.safeParse(record.rowErrors ?? []);
    const parsedErrorCode = ErrorCodeSchema.safeParse(record.errorCode);
    const parsedErrorDetails = ErrorDetailsSchema.safeParse(record.errorDetails);
    return Upload.reconstitute(record.id, {
      fileName: fileName.value,
      fileKey: record.fileKey,
      status: status.value,
      userId: record.userId,
      totalRows: record.totalRows,
      processedRows: record.processedRows,
      failedRows: record.failedRows,
      errorMessage: record.errorMessage,
      // The mapper is pure: invalid JSON degrades to empty values without logging.
      errorCode: parsedErrorCode.success ? parsedErrorCode.data : null,
      errorDetails: parsedErrorDetails.success ? parsedErrorDetails.data : null,
      rowErrors: parsedRowErrors.success ? parsedRowErrors.data : [],
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  },

  toPersistence(upload: Upload): UploadPersistence {
    return {
      id: upload.id,
      fileName: upload.fileName.value,
      fileKey: upload.fileKey,
      status: upload.status.value,
      userId: upload.userId,
      totalRows: upload.totalRows,
      processedRows: upload.processedRows,
      failedRows: upload.failedRows,
      errorMessage: upload.errorMessage,
      errorCode: upload.errorCode,
      // Details are built from JSON-safe values (strings, arrays, records) in the domain.
      errorDetails:
        upload.errorDetails === null
          ? Prisma.DbNull
          : (upload.errorDetails as Prisma.InputJsonObject),
      rowErrors: upload.rowErrors.map((error) => ({ ...error })), // plain objects: valid Json
      createdAt: upload.createdAt,
    };
  },
};
