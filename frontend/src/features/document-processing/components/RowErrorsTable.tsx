'use client';

import { useState } from 'react';
import { Pagination } from '@/shared/components/Pagination';
import { formatNumber } from '@/shared/lib/format';
import { describeRowError } from '../lib/describeErrors';
import { ERRORS_PAGE_SIZE, countByField, filterByField, paginate } from '../lib/rowErrorFilters';
import type { RowErrorDto } from '../types/upload.types';

interface RowErrorsTableProps {
  errors: RowErrorDto[];
  failedRows: number;
}

const TH = 'px-4 py-3 font-semibold';

function fieldLabel(field: string): string {
  return field === '' ? 'Sin columna' : field;
}

export function RowErrorsTable({ errors, failedRows }: RowErrorsTableProps) {
  const [field, setField] = useState<string | null>(null);
  const [requestedPage, setRequestedPage] = useState(1);

  const fields = countByField(errors);
  const filtered = filterByField(errors, field);
  const { items, page, totalPages } = paginate(filtered, requestedPage, ERRORS_PAGE_SIZE);

  const select = (next: string | null) => {
    setField(next);
    setRequestedPage(1);
  };

  return (
    <div className="space-y-3">
      {fields.length > 1 ? (
        <div role="group" aria-label="Filtrar por columna" className="flex flex-wrap gap-2">
          <FieldChip label="Todas" count={errors.length} pressed={field === null} onClick={() => select(null)} />
          {fields.map((entry) => (
            <FieldChip
              key={entry.field}
              label={fieldLabel(entry.field)}
              count={entry.count}
              pressed={field === entry.field}
              onClick={() => select(entry.field)}
            />
          ))}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-card border border-line bg-surface shadow-card">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-bg text-xs uppercase tracking-wide text-ink-muted">
            <tr>
              <th scope="col" className={TH}>Fila</th>
              <th scope="col" className={`${TH} hidden sm:table-cell`}>Columna</th>
              <th scope="col" className={`${TH} hidden sm:table-cell`}>Valor</th>
              <th scope="col" className={`${TH} hidden sm:table-cell`}>Qué pasa y cómo corregirlo</th>
            </tr>
          </thead>
          <tbody>
            {items.map((error, index) => (
              <tr
                className="border-t border-line align-top transition-colors duration-150 ease-brand hover:bg-primary-soft/50 motion-reduce:transition-none"
                key={`${error.row}-${error.field ?? ''}-${index}`}
              >
                <td className="w-full max-w-0 px-4 py-3 tabular-nums text-ink-muted sm:w-auto sm:max-w-none">
                  <span className="hidden sm:inline">{error.row}</span>
                  <MobileDetail error={error} />
                </td>
                <td className="hidden px-4 py-3 sm:table-cell">
                  {error.field ? (
                    <span className="inline-flex rounded-full bg-danger-soft px-2.5 py-0.5 text-xs font-medium text-danger">{error.field}</span>
                  ) : (
                    <span className="text-ink-muted">—</span>
                  )}
                </td>
                <td className="hidden min-w-28 max-w-56 break-words px-4 py-3 font-mono sm:table-cell text-[13px] text-ink">{error.value || '—'}</td>
                <td className="hidden min-w-60 px-4 py-3 text-ink sm:table-cell">{describeRowError(error)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setRequestedPage} />

      {failedRows > errors.length ? (
        <p className="text-sm text-ink-muted">
          Se muestran los primeros {errors.length} errores de {failedRows}.
        </p>
      ) : null}
      <p className="text-sm text-ink-muted">La fila 1 es la primera después de la cabecera.</p>
    </div>
  );
}

/** Below `sm` the extra columns are hidden; this stacks their content under the row number. */
function MobileDetail({ error }: { error: RowErrorDto }) {
  return (
    <div className="mt-1 space-y-1.5 whitespace-normal sm:hidden">
      <div className="flex flex-wrap items-center gap-2 text-ink">
        <span className="font-medium">Fila {error.row}</span>
        {error.field ? (
          <span className="inline-flex rounded-full bg-danger-soft px-2.5 py-0.5 text-xs font-medium text-danger">{error.field}</span>
        ) : null}
        {error.value ? <span className="break-all font-mono text-[13px]">{error.value}</span> : null}
      </div>
      <p className="text-ink">{describeRowError(error)}</p>
    </div>
  );
}

interface FieldChipProps {
  label: string;
  count: number;
  pressed: boolean;
  onClick: () => void;
}

function FieldChip({ label, count, pressed, onClick }: FieldChipProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium transition duration-150 ease-brand motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
        pressed
          ? 'border-transparent bg-surface text-ink shadow-card ring-2 ring-danger'
          : 'border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink'
      }`}
    >
      {label}{' '}
      <span className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${pressed ? 'bg-danger-soft text-danger' : 'bg-bg text-ink-subtle'}`}>
        {formatNumber(count)}
      </span>
    </button>
  );
}
