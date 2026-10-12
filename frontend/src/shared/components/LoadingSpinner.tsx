export function LoadingSpinner() {
  return (
    <div role="status" className="flex items-center gap-3 py-6 text-ink-muted">
      <span
        aria-hidden="true"
        className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-accent motion-reduce:animate-none"
      />
      <span>Cargando…</span>
    </div>
  );
}
