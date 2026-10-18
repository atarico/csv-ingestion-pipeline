import type { IQueryHandler } from '../../../../shared/application/IQueryHandler.js';
import type { DomainError } from '../../../../shared/domain/DomainError.js';
import { Either } from '../../../../shared/domain/Either.js';
import { totalPages } from '../../../../shared/domain/Pagination.js';
import type { IUploadRepository } from '../../../domain/repositories/IUploadRepository.js';
import type { PaginatedDto, UploadSummaryDto } from '../../dtos/UploadDtos.js';
import { UploadDtoMapper } from '../../mappers/UploadDtoMapper.js';
import type { ListUploadsQuery } from '../objects/ListUploadsQuery.js';

export class ListUploadsQueryHandler implements IQueryHandler<
  ListUploadsQuery,
  PaginatedDto<UploadSummaryDto>
> {
  constructor(private readonly uploadRepository: IUploadRepository) {}

  async execute(
    query: ListUploadsQuery,
  ): Promise<Either<DomainError, PaginatedDto<UploadSummaryDto>>> {
    const { page, limit } = query;
    const result = await this.uploadRepository.findByUser(
      query.userId,
      { page, limit },
      query.filter,
    );
    return Either.right({
      data: result.items.map((upload) => UploadDtoMapper.toSummary(upload)),
      total: result.total,
      page,
      limit,
      totalPages: totalPages(result.total, limit),
    });
  }
}
