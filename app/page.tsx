import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const displayFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display",
});

const bodyFont = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

const featureHighlights = [
  {
    title: "Patient onboarding",
    description:
      "Guide patients from sign-up to completed intake with a clear first-visit path.",
  },
  {
    title: "Scheduling lifecycle",
    description:
      "Availability, booking, reschedule, and cancellation states are visible end-to-end.",
  },
  {
    title: "Clinical continuity",
    description:
      "Encounters, SOAP/progress notes, and patient record summaries stay connected.",
  },
  {
    title: "Provider workflow hub",
    description:
      "Upcoming queues, encounter actions, and note entry points are organized in one dashboard.",
  },
  {
    title: "Patient portal visibility",
    description:
      "Patients can review upcoming appointments, encounter status, and record summaries.",
  },
  {
    title: "Compliance baseline",
    description:
      "RLS-secured records, auditable events, and schema-validated writes support HIPAA-oriented operations.",
  },
];

const coreFlows = [
  {
    step: "01",
    title: "Register and verify",
    description: "Patients and providers sign in to role-based dashboards.",
  },
  {
    step: "02",
    title: "Schedule and prepare",
    description:
      "Patients book from live slots and providers track upcoming queue activity.",
  },
  {
    step: "03",
    title: "Consult and document",
    description:
      "Encounter sessions are launched securely and notes are captured in workflow.",
  },
  {
    step: "04",
    title: "Review patient history",
    description:
      "Patients can revisit clinical summaries while providers continue care.",
  },
];

const capabilitySections = [
  {
    label: "Core APIs",
    items: ["/auth", "/patients", "/appointments", "/medical-records"],
  },
  {
    label: "Role-aware experiences",
    items: [
      "Patient onboarding + portal",
      "Provider dashboard + queue",
      "Encounter session workspace",
      "Clinical notes and record summaries",
    ],
  },
];

export const metadata: Metadata = {
  title: "Health Stack | Virtual Care Platform",
  description:
    "A modern virtual care platform for onboarding, scheduling, secure consultations, and clinical documentation.",
};

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main
      className={`relative min-h-screen overflow-hidden bg-[#f8f4ef] text-slate-900 ${displayFont.variable} ${bodyFont.variable}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(6,182,212,0.2),transparent_32%),radial-gradient(circle_at_90%_10%,rgba(249,115,22,0.22),transparent_30%),radial-gradient(circle_at_50%_95%,rgba(15,23,42,0.14),transparent_45%)]" />
      <div className="pointer-events-none absolute -left-20 top-24 h-56 w-56 rounded-full border border-slate-900/10" />
      <div className="pointer-events-none absolute bottom-20 right-8 h-28 w-28 rounded-full border border-cyan-900/25" />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col px-6 pb-16 pt-8 md:px-10">
        <header className="flex items-center justify-between rounded-full border border-slate-900/10 bg-white/70 px-5 py-3 backdrop-blur-sm">
          <p className="font-[family-name:var(--font-display)] text-2xl tracking-wide text-cyan-900">
            Health Stack
          </p>
          <div className="flex items-center gap-2">
            <Link
              href="/pricing"
              className="rounded-full border border-transparent px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-900/20"
            >
              Pricing
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-slate-900/20 px-4 py-2 text-sm font-medium transition hover:border-cyan-900/50"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-cyan-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-800"
            >
              Start free
            </Link>
          </div>
        </header>

        <section className="grid gap-12 pb-14 pt-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-8">
            <p className="inline-flex rounded-full border border-cyan-900/20 bg-cyan-900/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-900">
              Built for Virtual Care Operations
            </p>
            <h1 className="font-[family-name:var(--font-display)] text-5xl leading-[0.92] text-balance md:text-7xl">
              One clinical flow from intake to follow-up.
            </h1>
            <p className="max-w-xl font-[family-name:var(--font-body)] text-base text-slate-700 md:text-lg">
              Health Stack gives teams a clear API-backed experience for registration,
              scheduling, secure consultations, and records review without fragmented
              tools.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/register"
                className="rounded-full bg-cyan-900 px-6 py-3 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-cyan-800"
              >
                Start as patient
              </Link>
              <Link
                href="/login"
                className="rounded-full border border-slate-900/25 bg-white/60 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-slate-900 transition hover:border-slate-900/50"
              >
                Provider login
              </Link>
              <Link
                href="/pricing"
                className="rounded-full border border-transparent px-6 py-3 text-sm font-semibold uppercase tracking-wide text-slate-700 transition hover:border-slate-900/20"
              >
                View pricing
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-900/10 bg-white/75 p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.6)] backdrop-blur-sm">
            <p className="font-[family-name:var(--font-body)] text-xs uppercase tracking-[0.2em] text-slate-500">
              Core flow
            </p>
            <div className="mt-6 space-y-4">
              {coreFlows.map((flow) => (
                <div
                  key={flow.step}
                  className="rounded-2xl border border-slate-900/10 bg-white px-4 py-4"
                >
                  <p className="font-[family-name:var(--font-display)] text-2xl leading-none text-cyan-900">
                    {flow.step}
                  </p>
                  <div>
                    <p className="font-semibold text-slate-900">{flow.title}</p>
                    <p className="text-sm text-slate-600">{flow.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-3">
          {featureHighlights.map((feature) => (
            <article
              key={feature.title}
              className="rounded-3xl border border-slate-900/10 bg-white/80 p-6 transition hover:-translate-y-1 hover:border-cyan-900/40"
            >
              <h2 className="font-[family-name:var(--font-display)] text-3xl text-cyan-950">
                {feature.title}
              </h2>
              <p className="mt-4 font-[family-name:var(--font-body)] text-sm leading-relaxed text-slate-700">
                {feature.description}
              </p>
            </article>
          ))}
        </section>

        <section className="mt-12 grid gap-6 rounded-3xl border border-slate-900/10 bg-white/75 p-6 backdrop-blur-sm md:grid-cols-2 md:p-8">
          {capabilitySections.map((section) => (
            <article
              key={section.label}
              className="rounded-2xl border border-slate-900/10 bg-white px-5 py-5"
            >
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                {section.label}
              </p>
              <ul className="mt-4 space-y-2 text-sm text-slate-700">
                {section.items.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-cyan-900" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        <section className="mt-10 rounded-3xl border border-slate-900/10 bg-slate-900 p-8 text-slate-100 md:p-10">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">
            Ready to launch
          </p>
          <h2 className="mt-4 font-[family-name:var(--font-display)] text-4xl md:text-5xl">
            Build your virtual care workflow in one stack.
          </h2>
          <p className="mt-4 max-w-2xl text-sm text-slate-300 md:text-base">
            Start with core features now and scale by role, API surface, and
            operational depth as your clinic grows.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/register"
              className="rounded-full bg-cyan-300 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-slate-950 transition hover:bg-cyan-200"
            >
              Start free
            </Link>
            <Link
              href="/pricing"
              className="rounded-full border border-slate-600 px-6 py-3 text-sm font-semibold uppercase tracking-wide transition hover:border-cyan-300 hover:text-cyan-200"
            >
              Compare plans
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
