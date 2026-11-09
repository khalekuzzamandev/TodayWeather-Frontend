import Link from "next/link";

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-16 text-slate-100">
      <p className="text-xs uppercase tracking-[0.2em] text-sky-300">Contact</p>
      <h1 className="mt-2 text-4xl font-semibold">Get in touch</h1>
      <p className="mt-5 text-lg text-slate-300">Email: hello@todayweather.app</p>
      <Link href="/" className="mt-6 inline-flex rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200">Back home</Link>
    </main>
  );
}
