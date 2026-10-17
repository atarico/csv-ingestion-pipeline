'use client';

import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { getOutcome, type OutcomeKey, type UploadListFilter } from '../lib/outcomes';
import { getPollingInterval } from '../lib/polling';
import { uploadsClient } from './uploadsClient';

export const uploadKeys = {
  all: ['uploads'] as const,
  lists: () => [...uploadKeys.all, 'list'] as const,
  list: (page: number) => [...uploadKeys.lists(), { page }] as const,
  recent: (filter: UploadListFilter) => [...uploadKeys.lists(), 'recent', filter] as const,
  details: () => [...uploadKeys.all, 'detail'] as const,
  detail: (id: string) => [...uploadKeys.details(), id] as const,
  results: (id: string, page: number) => [...uploadKeys.detail(id), 'results', { page }] as const,
  stats: () => [...uploadKeys.all, 'stats'] as const,
};

const LIST_REFRESH_MS = 5000;
const RECENT_LIMIT = 10;

/** sessionStorage key read by the detail page to show the "uploaded" banner once. */
export const JUST_UPLOADED_KEY = 'carbonbox:just-uploaded';

export function useUploads(page: number) {
  return useQuery({
    queryKey: uploadKeys.list(page),
    queryFn: () => uploadsClient.list(page),
    refetchInterval: LIST_REFRESH_MS,
    placeholderData: keepPreviousData,
  });
}

/**
 * Latest uploads of one dashboard outcome. Deliberately no `keepPreviousData`: switching outcome
 * must show a skeleton, never another outcome's rows.
 */
export function useRecentUploads(outcomeKey: OutcomeKey) {
  const { filter } = getOutcome(outcomeKey);
  return useQuery({
    queryKey: uploadKeys.recent(filter),
    queryFn: () => uploadsClient.list(1, { limit: RECENT_LIMIT, ...filter }),
    refetchInterval: LIST_REFRESH_MS,
  });
}

export function useUpload(id: string) {
  return useQuery({
    queryKey: uploadKeys.detail(id),
    queryFn: () => uploadsClient.getById(id),
    refetchInterval: (query) => getPollingInterval(query.state.data?.status),
  });
}

export function useUploadResults(id: string, page: number, enabled: boolean) {
  return useQuery({
    queryKey: uploadKeys.results(id, page),
    queryFn: () => uploadsClient.results(id, page),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useUploadStats() {
  return useQuery({
    queryKey: uploadKeys.stats(),
    queryFn: () => uploadsClient.stats(),
    refetchInterval: LIST_REFRESH_MS,
  });
}

export function useCreateUpload() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [progress, setProgress] = useState(0);

  const mutation = useMutation({
    mutationFn: (file: File) => {
      setProgress(0);
      return uploadsClient.create(file, setProgress);
    },
    onSuccess: async (created) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: uploadKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: uploadKeys.stats() }),
      ]);
      try {
        sessionStorage.setItem(JUST_UPLOADED_KEY, created.id);
      } catch {
        // Storage can be blocked; the banner is a nicety, the redirect is not.
      }
      router.push(`/uploads/${created.id}`);
    },
  });

  return { ...mutation, progress };
}
