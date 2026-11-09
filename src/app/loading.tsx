export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
      <div className="flex items-center gap-3 rounded-full border border-white/10 bg-slate-900/70 px-6 py-3 text-sm text-slate-200">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
        Loading weather data…
      </div>
    </div>
  );
}
