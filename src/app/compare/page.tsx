import Link from "next/link";

export default function ComparePage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-16 text-slate-100">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-sky-300">Compare</p>
          <h1 className="mt-2 text-3xl font-semibold">Regional climate comparison</h1>
        </div>
        <Link href="/" className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200">Back home</Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["New York", "22°", "Sunny"],
          ["Paris", "18°", "Cloud cover"],
          ["Tokyo", "26°", "Clear"],
          ["London", "15°", "Rain"],
        ].map(([city, temp, condition]) => (
          <div key={city} className="rounded-3xl border border-white/10 bg-slate-900/70 p-5">
            <p className="text-sm text-slate-400">{city}</p>
            <p className="mt-4 text-3xl font-semibold text-white">{temp}</p>
            <p className="mt-2 text-slate-200">{condition}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
