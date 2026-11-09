import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-16 text-slate-100">
      <p className="text-xs uppercase tracking-[0.2em] text-sky-300">Privacy</p>
      <h1 className="mt-2 text-4xl font-semibold">Privacy policy</h1>
      <p className="mt-5 text-slate-300">This demo stores favorite city selections in your browser for a better local experience. No user account is required for core weather functionality.</p>
      <Link href="/" className="mt-6 inline-flex rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200">Back home</Link>
    </main>
  );
}
