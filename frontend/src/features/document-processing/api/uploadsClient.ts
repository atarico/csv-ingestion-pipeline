import { apiClient } from '@/shared/lib/api-client';
import type {
  ActivityDataDto,
  CreateUploadResult,
  PaginatedDto,
  UploadDto,
  UploadStatsDto,
  UploadSummaryDto,
} from '../types/upload.types';

export const uploadsClient = {
  async create(file: File, onProgress?: (percent: number) => void): Promise<CreateUploadResult> {
    const body = new FormData();
    body.append('file', file);
    const response = await apiClient.post<CreateUploadResult>('/uploads', body, {
      onUploadProgress: (event) => onProgress?.(Math.round((event.loaded * 100) / (event.total ?? event.loaded))),
    });
    return response.data;
  },

  async getById(id: string): Promise<UploadDto> {
    const response = await apiClient.get<UploadDto>(`/uploads/${encodeURIComponent(id)}`);
    return response.data;
  },

  async list(page: number, limit = 10): Promise<PaginatedDto<UploadSummaryDto>> {
    const response = await apiClient.get<PaginatedDto<UploadSummaryDto>>('/uploads', { params: { page, limit } });
    return response.data;
  },

  async results(id: string, page: number, limit = 100): Promise<PaginatedDto<ActivityDataDto>> {
    const response = await apiClient.get<PaginatedDto<ActivityDataDto>>(`/uploads/${encodeURIComponent(id)}/results`, {
      params: { page, limit },
    });
    return response.data;
  },

  async stats(): Promise<UploadStatsDto> {
    const response = await apiClient.get<UploadStatsDto>('/uploads/stats');
    return response.data;
  },
};
