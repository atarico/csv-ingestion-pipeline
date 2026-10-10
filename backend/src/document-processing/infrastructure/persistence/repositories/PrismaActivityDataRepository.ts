import type { PrismaClient } from '../../../../generated/prisma/client.js';
import type { PaginatedResult, PaginationParams } from '../../../../shared/domain/Pagination.js';
import type { ActivityData } from '../../../domain/entities/ActivityData.js';
import type { IActivityDataRepository } from '../../../domain/repositories/IActivityDataRepository.js';
import { PrismaActivityDataMapper } from '../mappers/PrismaActivityDataMapper.js';

export class PrismaActivityDataRepository implements IActivityDataRepository {
  static readonly CHUNK_SIZE = 500;

  constructor(private readonly prismaClient: PrismaClient) {}

  /** Each chunk is atomic, the whole call is not: reprocessing deletes first, so partial inserts are safe. */
  async saveMany(rows: ActivityData[]): Promise<void> {
    const chunkSize = PrismaActivityDataRepository.CHUNK_SIZE;
    for (let start = 0; start < rows.length; start += chunkSize) {
      const data = rows
        .slice(start, start + chunkSize)
        .map((row) => PrismaActivityDataMapper.toPersistence(row));
      await this.prismaClient.activityData.createMany({ data });
    }
  }

  async deleteByUploadId(uploadId: string): Promise<void> {
    await this.prismaClient.activityData.deleteMany({ where: { uploadId } });
  }

  async findByUploadId(
    uploadId: string,
    pagination: PaginationParams,
  ): Promise<PaginatedResult<ActivityData>> {
    const { page, limit } = pagination;
    const [records, total] = await this.prismaClient.$transaction([
      this.prismaClient.activityData.findMany({
        where: { uploadId },
        orderBy: { rowNumber: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prismaClient.activityData.count({ where: { uploadId } }),
    ]);
    return {
      items: records.map((record) => PrismaActivityDataMapper.toDomain(record)),
      total,
      page,
      limit,
    };
  }

  countByUploadId(uploadId: string): Promise<number> {
    return this.prismaClient.activityData.count({ where: { uploadId } });
  }
}
