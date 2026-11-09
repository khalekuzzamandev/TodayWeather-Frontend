"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
      <div className="max-w-md rounded-3xl border border-rose-400/30 bg-rose-500/10 p-8 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-rose-200">Error</p>
        <h1 className="mt-3 text-2xl font-semibold">Something went wrong</h1>
        <p className="mt-3 text-sm text-rose-100/80">The weather service could not load data right now.</p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 rounded-full bg-rose-500 px-4 py-2 text-sm font-medium text-white"
        >
          Retry
        </button>
      </div>
    </main>
  );
}
