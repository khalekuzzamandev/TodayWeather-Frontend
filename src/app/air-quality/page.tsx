import Link from "next/link";

export default function AirQualityPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-16 text-slate-100">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-sky-300">Air Quality</p>
          <h1 className="mt-2 text-3xl font-semibold">Pollution and atmosphere</h1>
        </div>
        <Link href="/" className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200">Back home</Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          ["PM2.5", "15"],
          ["PM10", "20"],
          ["NO₂", "12"],
          ["O₃", "24"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
            <p className="text-sm text-slate-400">{label}</p>
            <p className="mt-4 text-3xl font-semibold text-white">{value}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
