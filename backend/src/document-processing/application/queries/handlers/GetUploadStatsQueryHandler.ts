import type { IQueryHandler } from '../../../../shared/application/IQueryHandler.js';
import type { DomainError } from '../../../../shared/domain/DomainError.js';
import { Either } from '../../../../shared/domain/Either.js';
import type { IUploadRepository } from '../../../domain/repositories/IUploadRepository.js';
import type { UploadStatsDto } from '../../dtos/UploadDtos.js';
import type { GetUploadStatsQuery } from '../objects/GetUploadStatsQuery.js';

export class GetUploadStatsQueryHandler implements IQueryHandler<
  GetUploadStatsQuery,
  UploadStatsDto
> {
  constructor(private readonly uploadRepository: IUploadRepository) {}

  async execute(query: GetUploadStatsQuery): Promise<Either<DomainError, UploadStatsDto>> {
    const counts = await this.uploadRepository.countByStatus(query.userId);
    return Either.right({
      total: counts.PENDING + counts.PROCESSING + counts.COMPLETED + counts.FAILED,
      pending: counts.PENDING,
      processing: counts.PROCESSING,
      completed: counts.COMPLETED,
      failed: counts.FAILED,
    });
  }
}
