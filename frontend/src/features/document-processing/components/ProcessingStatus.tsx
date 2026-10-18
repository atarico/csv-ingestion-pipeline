'use client';

import { ProgressBar } from '@/shared/components/ProgressBar';
import { StatusBadge } from '@/shared/components/StatusBadge';
import type { UploadDto } from '../types/upload.types';

/** Pulsing dot marking a file that is still being worked on; static under reduced motion. */
function LiveDot() {
  return (
    <span aria-hidden="true" className="relative flex h-2.5 w-2.5">
      <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-60 motion-safe:animate-ping" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
    </span>
  );
}

/** Status badge plus the hint or progress that matches the non-terminal states. */
export function ProcessingStatus({ upload }: { upload: UploadDto }) {
  const total = upload.totalRows ?? 0;
  const done = (upload.processedRows ?? 0) + (upload.failedRows ?? 0);
  const percent = total > 0 ? (done * 100) / total : 0;
  const isLive = upload.status === 'PENDING' || upload.status === 'PROCESSING';

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5">
        {isLive ? <LiveDot /> : null}
        <StatusBadge status={upload.status} announce />
      </div>
      {upload.status === 'PENDING' ? <p className="text-sm text-ink-muted">En espera de procesamiento…</p> : null}
      {upload.status === 'PROCESSING' ? (
        <div className="space-y-2">
          <ProgressBar value={percent} label="Progreso de procesamiento" />
          <p className="text-sm tabular-nums text-ink-muted">
            Procesando {done} de {total} filas
          </p>
        </div>
      ) : null}
    </div>
  );
}
