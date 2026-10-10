import type { PrismaClient } from '../../../../generated/prisma/client.js';
import type { PaginatedResult, PaginationParams } from '../../../../shared/domain/Pagination.js';
import type { Upload } from '../../../domain/entities/Upload.js';
import type {
  IUploadRepository,
  UploadStatusCounts,
} from '../../../domain/repositories/IUploadRepository.js';
import { PrismaUploadMapper } from '../mappers/PrismaUploadMapper.js';

export class PrismaUploadRepository implements IUploadRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  async save(upload: Upload): Promise<void> {
    const data = PrismaUploadMapper.toPersistence(upload);
    await this.prismaClient.upload.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    });
  }

  async findById(id: string): Promise<Upload | null> {
    const record = await this.prismaClient.upload.findUnique({ where: { id } });
    return record === null ? null : PrismaUploadMapper.toDomain(record);
  }

  async findByUser(userId: string, pagination: PaginationParams): Promise<PaginatedResult<Upload>> {
    const { page, limit } = pagination;
    const [records, total] = await this.prismaClient.$transaction([
      this.prismaClient.upload.findMany({
        where: { userId },
        // `id` breaks createdAt ties so pages never overlap or skip rows.
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prismaClient.upload.count({ where: { userId } }),
    ]);
    return {
      items: records.map((record) => PrismaUploadMapper.toDomain(record)),
      total,
      page,
      limit,
    };
  }

  async countByStatus(userId: string): Promise<UploadStatusCounts> {
    const groups = await this.prismaClient.upload.groupBy({
      by: ['status'],
      where: { userId },
      _count: { _all: true },
    });
    const counts: UploadStatusCounts = { PENDING: 0, PROCESSING: 0, COMPLETED: 0, FAILED: 0 };
    for (const group of groups) counts[group.status] = group._count._all;
    return counts;
  }
}
