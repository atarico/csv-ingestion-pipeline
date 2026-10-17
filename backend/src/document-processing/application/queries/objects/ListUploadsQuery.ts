import type { UploadListFilter } from '../../../domain/repositories/IUploadRepository.js';

export interface ListUploadsQuery {
  userId: string;
  page: number;
  limit: number;
  filter?: UploadListFilter;
}
