import * as z from 'zod';
import type { Prisma, Upload as UploadRecord } from '../../../../generated/prisma/client.js';
import { Upload } from '../../../domain/entities/Upload.js';
import { FileName } from '../../../domain/value-objects/FileName.js';
import { UploadStatus } from '../../../domain/value-objects/UploadStatus.js';

const RowErrorsSchema = z.array(
  z.object({ row: z.number().int(), field: z.string().optional(), message: z.string() }),
);

/** Every column except `updatedAt`, which Prisma maintains (`@updatedAt`); `rowErrors` is always an array. */
export type UploadPersistence = Omit<UploadRecord, 'updatedAt' | 'rowErrors'> & {
  rowErrors: Prisma.InputJsonArray;
};

export const PrismaUploadMapper = {
  toDomain(record: UploadRecord): Upload {
    const fileName = FileName.create(record.fileName);
    if (fileName.isLeft()) throw new Error('Corrupted fileName in database');
    const status = UploadStatus.fromValue(record.status);
    if (status.isLeft()) throw new Error('Corrupted status in database');

    const parsedRowErrors = RowErrorsSchema.safeParse(record.rowErrors ?? []);
    return Upload.reconstitute(record.id, {
      fileName: fileName.value,
      fileKey: record.fileKey,
      status: status.value,
      userId: record.userId,
      totalRows: record.totalRows,
      processedRows: record.processedRows,
      failedRows: record.failedRows,
      errorMessage: record.errorMessage,
      // The mapper is pure: invalid JSON degrades to an empty list without logging.
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
      rowErrors: upload.rowErrors.map((error) => ({ ...error })), // plain objects: valid Json
      createdAt: upload.createdAt,
    };
  },
};
