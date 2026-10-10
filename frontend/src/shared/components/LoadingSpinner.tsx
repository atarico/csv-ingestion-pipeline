export function LoadingSpinner() {
  return (
    <div role="status" className="flex items-center gap-3 py-6 text-slate-600">
      <span aria-hidden="true" className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600" />
      <span>Cargando…</span>
    </div>
  );
}
