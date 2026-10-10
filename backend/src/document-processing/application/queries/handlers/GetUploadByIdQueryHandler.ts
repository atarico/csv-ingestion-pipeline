import type { IQueryHandler } from '../../../../shared/application/IQueryHandler.js';
import { NotFoundError, type DomainError } from '../../../../shared/domain/DomainError.js';
import { Either } from '../../../../shared/domain/Either.js';
import type { IUploadRepository } from '../../../domain/repositories/IUploadRepository.js';
import type { UploadDto } from '../../dtos/UploadDtos.js';
import { UploadDtoMapper } from '../../mappers/UploadDtoMapper.js';
import type { GetUploadByIdQuery } from '../objects/GetUploadByIdQuery.js';

export class GetUploadByIdQueryHandler implements IQueryHandler<GetUploadByIdQuery, UploadDto> {
  constructor(private readonly uploadRepository: IUploadRepository) {}

  async execute(query: GetUploadByIdQuery): Promise<Either<DomainError, UploadDto>> {
    const upload = await this.uploadRepository.findById(query.id);
    if (upload === null || upload.userId !== query.userId) {
      return Either.left(new NotFoundError('Upload', query.id));
    }
    return Either.right(UploadDtoMapper.toDto(upload));
  }
}
