import { Button } from './Button';

type PaginationProps = {
  page: number;
  totalPages: number;
} & ({ onPageChange: (page: number) => void; hrefFor?: never } | { hrefFor: (page: number) => string; onPageChange?: never });

const CONTROL = 'rounded-full px-4 py-1.5 text-sm font-semibold';
const DISABLED = `${CONTROL} cursor-not-allowed border border-line text-ink-subtle`;

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
        <Button href={props.hrefFor(target)} variant="secondary" className="px-4! py-1.5!">
          {label}
        </Button>
      );
    }
    return (
      <Button variant="secondary" onClick={() => props.onPageChange?.(target)} className="px-4! py-1.5!">
        {label}
      </Button>
    );
  };

  return (
    <nav aria-label="Paginación" className="mt-4 flex items-center justify-between gap-3">
      {control('Anterior', page - 1, hasPrev)}
      <span className="text-sm text-ink-muted">
        Página {page} de {totalPages}
      </span>
      {control('Siguiente', page + 1, hasNext)}
    </nav>
  );
}
