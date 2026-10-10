import type { IQueryHandler } from '../../../../shared/application/IQueryHandler.js';
import { NotFoundError, type DomainError } from '../../../../shared/domain/DomainError.js';
import { Either } from '../../../../shared/domain/Either.js';
import { totalPages } from '../../../../shared/domain/Pagination.js';
import type { IActivityDataRepository } from '../../../domain/repositories/IActivityDataRepository.js';
import type { IUploadRepository } from '../../../domain/repositories/IUploadRepository.js';
import type { ActivityDataDto } from '../../dtos/ActivityDataDtos.js';
import type { PaginatedDto } from '../../dtos/UploadDtos.js';
import { ActivityDataDtoMapper } from '../../mappers/ActivityDataDtoMapper.js';
import type { GetUploadResultsQuery } from '../objects/GetUploadResultsQuery.js';

export class GetUploadResultsQueryHandler implements IQueryHandler<
  GetUploadResultsQuery,
  PaginatedDto<ActivityDataDto>
> {
  constructor(
    private readonly uploadRepository: IUploadRepository,
    private readonly activityDataRepository: IActivityDataRepository,
  ) {}

  async execute(
    query: GetUploadResultsQuery,
  ): Promise<Either<DomainError, PaginatedDto<ActivityDataDto>>> {
    const upload = await this.uploadRepository.findById(query.uploadId);
    if (upload === null || upload.userId !== query.userId) {
      return Either.left(new NotFoundError('Upload', query.uploadId));
    }

    const { page, limit } = query;
    const result = await this.activityDataRepository.findByUploadId(query.uploadId, {
      page,
      limit,
    });
    return Either.right({
      data: result.items.map((row) => ActivityDataDtoMapper.toDto(row)),
      total: result.total,
      page,
      limit,
      totalPages: totalPages(result.total, limit),
    });
  }
}
