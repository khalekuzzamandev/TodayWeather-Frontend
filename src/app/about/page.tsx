import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-16 text-slate-100">
      <p className="text-xs uppercase tracking-[0.2em] text-sky-300">About</p>
      <h1 className="mt-2 text-4xl font-semibold">TodayWeather</h1>
      <p className="mt-5 text-lg text-slate-300">
        TodayWeather provides a premium global weather experience built on live Open-Meteo data with a polished, responsive interface for fast decision-making.
      </p>
      <Link href="/" className="mt-6 inline-flex rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200">Back home</Link>
    </main>
  );
}
