import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-16 text-slate-100">
      <p className="text-xs uppercase tracking-[0.2em] text-sky-300">Terms</p>
      <h1 className="mt-2 text-4xl font-semibold">Terms of use</h1>
      <p className="mt-5 text-slate-300">TodayWeather uses live meteorological data and is provided for informational purposes. Please verify severe weather alerts with official local authorities when needed.</p>
      <Link href="/" className="mt-6 inline-flex rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200">Back home</Link>
    </main>
  );
}
