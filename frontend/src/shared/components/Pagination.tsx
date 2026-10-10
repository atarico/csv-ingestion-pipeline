import Link from 'next/link';

type PaginationProps = {
  page: number;
  totalPages: number;
} & ({ onPageChange: (page: number) => void; hrefFor?: never } | { hrefFor: (page: number) => string; onPageChange?: never });

const BASE = 'rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium';
const ENABLED = `${BASE} text-slate-800 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600`;
const DISABLED = `${BASE} cursor-not-allowed text-slate-400`;

export function Pagination(props: PaginationProps) {
  const { page, totalPages } = props;
  if (totalPages <= 1) return null;

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  const control = (label: string, target: number, enabled: boolean) => {
    if (!enabled) {
      return (
        <span aria-disabled="true" className={DISABLED}>
          {label}
        </span>
      );
    }
    if (props.hrefFor) {
      return (
        <Link href={props.hrefFor(target)} className={ENABLED}>
          {label}
        </Link>
      );
    }
    return (
      <button type="button" onClick={() => props.onPageChange?.(target)} className={ENABLED}>
        {label}
      </button>
    );
  };

  return (
    <nav aria-label="Paginación" className="mt-4 flex items-center justify-between gap-3">
      {control('Anterior', page - 1, hasPrev)}
      <span className="text-sm text-slate-600">
        Página {page} de {totalPages}
      </span>
      {control('Siguiente', page + 1, hasNext)}
    </nav>
  );
}
