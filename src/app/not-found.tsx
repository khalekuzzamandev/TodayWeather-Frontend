import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
      <div className="max-w-md rounded-3xl border border-white/10 bg-slate-900/80 p-8 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-sky-300">404</p>
        <h1 className="mt-3 text-3xl font-semibold">Page not found</h1>
        <p className="mt-3 text-slate-300">The route you requested doesn’t exist.</p>
        <Link href="/" className="mt-6 inline-flex rounded-full bg-sky-500 px-4 py-2 text-sm font-medium text-white">Return home</Link>
      </div>
    </main>
  );
}
