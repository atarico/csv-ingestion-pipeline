'use client';

import { ProgressBar } from '@/shared/components/ProgressBar';
import { StatusBadge } from '@/shared/components/StatusBadge';
import type { UploadDto } from '../types/upload.types';

/** Status badge plus the hint or progress that matches the non-terminal states. */
export function ProcessingStatus({ upload }: { upload: UploadDto }) {
  const total = upload.totalRows ?? 0;
  const done = (upload.processedRows ?? 0) + (upload.failedRows ?? 0);
  const percent = total > 0 ? (done * 100) / total : 0;

  return (
    <div className="space-y-3">
      <StatusBadge status={upload.status} announce />
      {upload.status === 'PENDING' ? <p className="text-sm text-slate-600">En espera de procesamiento…</p> : null}
      {upload.status === 'PROCESSING' ? (
        <div className="space-y-2">
          <ProgressBar value={percent} label="Progreso de procesamiento" />
          <p className="text-sm text-slate-700">
            Procesando {done} de {total} filas
          </p>
        </div>
      ) : null}
    </div>
  );
}
