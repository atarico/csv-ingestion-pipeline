import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/shared/lib/api-client';
import { uploadsClient } from './uploadsClient';

vi.mock('@/shared/lib/api-client', () => ({ apiClient: { get: vi.fn() } }));

describe('uploadsClient.list', () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockReset();
    vi.mocked(apiClient.get).mockResolvedValue({ data: { data: [], total: 0, page: 1, limit: 10, totalPages: 0 } });
  });

  it('keeps the previous behaviour when called with a page only', async () => {
    await uploadsClient.list(3);

    expect(apiClient.get).toHaveBeenCalledWith('/uploads', { params: { page: 3, limit: 10 } });
  });

  it('sends limit and the outcome filters when given', async () => {
    await uploadsClient.list(1, { limit: 5, status: 'COMPLETED', hasRowErrors: true });

    expect(apiClient.get).toHaveBeenCalledWith('/uploads', {
      params: { page: 1, limit: 5, status: 'COMPLETED', hasRowErrors: true },
    });
  });

  it('sends hasRowErrors=false (a falsy value must not be dropped)', async () => {
    await uploadsClient.list(1, { status: 'COMPLETED', hasRowErrors: false });

    expect(apiClient.get).toHaveBeenCalledWith('/uploads', {
      params: { page: 1, limit: 10, status: 'COMPLETED', hasRowErrors: false },
    });
  });
});
