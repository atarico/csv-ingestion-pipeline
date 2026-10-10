import type { UploadStatusValue } from '../types/upload.types';

export const POLLING_INTERVAL_MS = 3000;

/** Poll only while the worker may still change the upload; terminal states stop polling. */
export function getPollingInterval(status: UploadStatusValue | undefined): number | false {
  return status === 'PENDING' || status === 'PROCESSING' ? POLLING_INTERVAL_MS : false;
}
