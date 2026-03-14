import { ForgotPasswordForm } from "@/components/forgot-password-form";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Forgot Password | Health Stack",
};

export default function ForgotPasswordPage() {
  return (
    <div className="relative grid min-h-svh w-full overflow-hidden bg-[#f8f4ef] md:grid-cols-2">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_4%,rgba(6,182,212,0.2),transparent_32%),radial-gradient(circle_at_90%_10%,rgba(249,115,22,0.2),transparent_30%),radial-gradient(circle_at_50%_96%,rgba(15,23,42,0.12),transparent_40%)]" />
      <section className="hidden gap-8 bg-slate-900 p-10 text-slate-100 md:flex md:flex-col md:items-center md:justify-center md:text-center">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">
            Health Stack
          </p>
          <h1 className="text-4xl font-semibold leading-tight">
            Regain access to your secure care workspace.
          </h1>
          <p className="max-w-md text-sm text-slate-300 md:mx-auto">
            Request a password reset link and return to appointment scheduling,
            patient records, and provider workflows.
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
        <div className="w-full max-w-sm">
          <ForgotPasswordForm />
        </div>
      </section>
    </div>
  );
}
