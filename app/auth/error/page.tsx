import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Auth Error | Health Stack",
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const resolvedSearchParams = await searchParams;

  return (
    <div className="relative grid min-h-svh w-full overflow-hidden bg-[#f8f4ef] md:grid-cols-2">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_4%,rgba(6,182,212,0.2),transparent_32%),radial-gradient(circle_at_90%_10%,rgba(249,115,22,0.2),transparent_30%),radial-gradient(circle_at_50%_96%,rgba(15,23,42,0.12),transparent_40%)]" />
      <section className="hidden gap-8 bg-slate-900 p-10 text-slate-100 md:flex md:flex-col md:items-center md:justify-center md:text-center">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">
            Health Stack
          </p>
          <h1 className="text-4xl font-semibold leading-tight">
            Authentication could not be completed.
          </h1>
          <p className="max-w-md text-sm text-slate-300 md:mx-auto">
            Retry from login and continue to your care dashboard once verified.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex w-fit self-center rounded-full border border-slate-600 px-4 py-2 text-sm transition hover:border-cyan-300 hover:text-cyan-200"
        >
          Back to landing page
        </Link>
      </section>
      <section className="relative flex items-center justify-center bg-white/45 p-6 md:p-10">
        <div className="w-full max-w-sm space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Auth Error
          </p>
          <h2 className="text-2xl font-semibold text-cyan-950">
            Sorry, something went wrong.
          </h2>
          {resolvedSearchParams?.error ? (
            <p className="text-sm text-slate-600">
              Code error: <span className="font-mono">{resolvedSearchParams.error}</span>
            </p>
          ) : (
            <p className="text-sm text-slate-600">
              An unspecified authentication error occurred.
            </p>
          )}
          <div className="pt-2 text-sm">
            <Link
              href="/login"
              className="font-medium text-cyan-900 underline underline-offset-4"
            >
              Return to login
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
