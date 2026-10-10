import type { UploadStatusValue } from '@/features/document-processing/types/upload.types';

const STATUS_STYLES: Record<UploadStatusValue, { label: string; className: string }> = {
  PENDING: { label: 'Pendiente', className: 'bg-amber-100 text-amber-800' },
  PROCESSING: { label: 'Procesando', className: 'bg-blue-100 text-blue-800' },
  COMPLETED: { label: 'Completado', className: 'bg-green-100 text-green-800' },
  FAILED: { label: 'Fallido', className: 'bg-red-100 text-red-800' },
};

/**
 * `announce` makes the badge a live region; keep it off inside tables, where every refresh
 * would otherwise be announced once per row.
 */
export function StatusBadge({ status, announce = false }: { status: UploadStatusValue; announce?: boolean }) {
  const { label, className } = STATUS_STYLES[status];
  return (
    <span role={announce ? 'status' : undefined} className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
