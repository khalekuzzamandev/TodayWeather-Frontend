import Link from "next/link";

export default function MapPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-16 text-slate-100">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-sky-300">Weather map</p>
          <h1 className="mt-2 text-3xl font-semibold">Animated forecast overlays</h1>
        </div>
        <Link href="/" className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200">Back home</Link>
      </div>
      <div className="h-[500px] rounded-3xl border border-white/10 bg-slate-900/80" />
    </main>
  );
}
