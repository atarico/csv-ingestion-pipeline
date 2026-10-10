import type { ICommandHandler } from '../../../../shared/application/ICommandHandler.js';
import type { IFileStorage } from '../../../../shared/application/ports/IFileStorage.js';
import type { ILogger } from '../../../../shared/application/ports/ILogger.js';
import {
  InvalidStateTransitionError,
  NotFoundError,
  type DomainError,
} from '../../../../shared/domain/DomainError.js';
import { Either } from '../../../../shared/domain/Either.js';
import { ActivityData } from '../../../domain/entities/ActivityData.js';
import { MAX_STORED_ROW_ERRORS, type RowError } from '../../../domain/entities/RowError.js';
import type { FailureCounts, Upload } from '../../../domain/entities/Upload.js';
import type { IActivityDataRepository } from '../../../domain/repositories/IActivityDataRepository.js';
import type { IUploadRepository } from '../../../domain/repositories/IUploadRepository.js';
import type { ProcessFileResult } from '../../dtos/UploadDtos.js';
import type { ICsvParser } from '../../ports/ICsvParser.js';
import type { ProcessFileCommand } from '../objects/ProcessFileCommand.js';

export class ProcessFileCommandHandler implements ICommandHandler<
  ProcessFileCommand,
  ProcessFileResult
> {
  static readonly PROGRESS_EVERY_ROWS = 500;

  constructor(
    private readonly uploadRepository: IUploadRepository,
    private readonly activityDataRepository: IActivityDataRepository,
    private readonly fileStorage: IFileStorage,
    private readonly csvParser: ICsvParser,
    private readonly logger: ILogger,
  ) {}

  async execute(command: ProcessFileCommand): Promise<Either<DomainError, ProcessFileResult>> {
    const startedAt = Date.now();
    const { uploadId, fileKey } = command;
    this.logger.info({ uploadId, fileKey }, 'Processing file');

    const upload = await this.uploadRepository.findById(uploadId);
    if (upload === null) return Either.left(new NotFoundError('Upload', uploadId));
    if (upload.status.isTerminal()) {
      return Either.left(new InvalidStateTransitionError(upload.status.value, 'PROCESSING'));
    }

    // Pass 1: validate the header and count the data rows.
    const firstPass = await this.fileStorage.download(upload.fileKey);
    if (firstPass.isLeft()) return Either.left(firstPass.value);

    const counted = await this.csvParser.countDataRows(firstPass.value);
    if (counted.isLeft()) {
      return this.finishFailed(
        upload,
        counted.value.message,
        undefined,
        { uploadId, status: 'FAILED', totalRows: 0, processedRows: 0, failedRows: 0 },
        startedAt,
      );
    }
    const totalRows = counted.value;
    if (totalRows === 0) {
      return this.finishFailed(
        upload,
        'CSV has no data rows',
        { processedRows: 0, failedRows: 0, rowErrors: [] },
        { uploadId, status: 'FAILED', totalRows: 0, processedRows: 0, failedRows: 0 },
        startedAt,
      );
    }

    const started = upload.startProcessing(totalRows);
    if (started.isLeft()) return Either.left(started.value);
    await this.uploadRepository.save(upload);
    this.logger.info({ uploadId, totalRows }, 'Processing started');

    // Idempotent reprocessing after a redelivered message.
    await this.activityDataRepository.deleteByUploadId(uploadId);

    // Pass 2: stream the rows, persisting valid ones in batches.
    const secondPass = await this.fileStorage.download(upload.fileKey);
    if (secondPass.isLeft()) return Either.left(secondPass.value);

    let dataRows = 0;
    let processed = 0;
    let failed = 0;
    let batch: ActivityData[] = [];
    const rowErrors: RowError[] = [];

    const parsed = await this.csvParser.parse(secondPass.value, async (record, rowNumber) => {
      dataRows += 1;
      const row = ActivityData.create({
        uploadId,
        rowNumber,
        category: record['category'],
        amount: record['amount'],
        unit: record['unit'],
        date: record['date'],
      });
      if (row.isRight()) {
        batch.push(row.value);
      } else {
        failed += 1;
        for (const fieldError of row.value.fieldErrors) {
          if (rowErrors.length >= MAX_STORED_ROW_ERRORS) break;
          rowErrors.push({
            row: rowNumber,
            field: fieldError.field,
            message: fieldError.message,
          });
        }
      }

      if (dataRows % ProcessFileCommandHandler.PROGRESS_EVERY_ROWS === 0) {
        await this.activityDataRepository.saveMany(batch);
        processed += batch.length;
        batch = [];
        // Cannot be a Left: startProcessing succeeded above and nothing else changes the status.
        upload.recordProgress(processed, failed);
        await this.uploadRepository.save(upload);
      }
    });

    if (parsed.isLeft()) {
      // Malformed body after a valid header: the unflushed batch is discarded.
      // The real adapter reads the whole file in pass 1, so this branch is defensive;
      // it is reachable only with a parser that fails mid-stream.
      return this.finishFailed(
        upload,
        parsed.value.message,
        { processedRows: processed, failedRows: failed, rowErrors },
        { uploadId, status: 'FAILED', totalRows, processedRows: processed, failedRows: failed },
        startedAt,
      );
    }

    await this.activityDataRepository.saveMany(batch);
    processed += batch.length;

    if (processed === 0) {
      return this.finishFailed(
        upload,
        'No valid rows found',
        { processedRows: 0, failedRows: failed, rowErrors },
        { uploadId, status: 'FAILED', totalRows, processedRows: 0, failedRows: failed },
        startedAt,
      );
    }

    const completed = upload.complete({ processedRows: processed, failedRows: failed, rowErrors });
    if (completed.isLeft()) return Either.left(completed.value);
    await this.uploadRepository.save(upload);

    const result: ProcessFileResult = {
      uploadId,
      status: 'COMPLETED',
      totalRows: processed + failed,
      processedRows: processed,
      failedRows: failed,
    };
    this.logEnd(result, startedAt);
    return Either.right(result);
  }

  /** Marks the upload FAILED, persists it and reports the business outcome as a Right. */
  private async finishFailed(
    upload: Upload,
    message: string,
    counts: FailureCounts | undefined,
    result: ProcessFileResult,
    startedAt: number,
  ): Promise<Either<DomainError, ProcessFileResult>> {
    const failed = upload.fail(message, counts);
    if (failed.isLeft()) return Either.left(failed.value);
    await this.uploadRepository.save(upload);
    this.logEnd(result, startedAt);
    return Either.right(result);
  }

  private logEnd(result: ProcessFileResult, startedAt: number): void {
    this.logger.info(
      {
        uploadId: result.uploadId,
        status: result.status,
        processedRows: result.processedRows,
        failedRows: result.failedRows,
        durationMs: Date.now() - startedAt,
      },
      'File processed',
    );
  }
}
