import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import Link from "next/link";

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

const plans = [
  {
    name: "Starter",
    price: "$0",
    cadence: "/month",
    description: "For early teams validating patient onboarding and basic operations.",
    features: [
      "Patient registration and profile intake",
      "Appointment booking and provider queue",
      "Basic consultation session flow",
      "Community support",
    ],
    ctaLabel: "Start free",
    ctaHref: "/register",
    highlighted: false,
  },
  {
    name: "Clinic",
    price: "$149",
    cadence: "/month",
    description: "For active clinics running daily scheduling and documentation workflows.",
    features: [
      "Everything in Starter",
      "Clinical notes + patient records workspace",
      "Expanded audit logging visibility",
      "Priority support",
    ],
    ctaLabel: "Choose Clinic",
    ctaHref: "/register",
    highlighted: true,
  },
  {
    name: "Growth",
    price: "Custom",
    cadence: "",
    description: "For larger organizations needing tailored scale and rollout support.",
    features: [
      "Everything in Clinic",
      "Tenant-focused implementation guidance",
      "Environment rollout assistance",
      "Dedicated success partner",
    ],
    ctaLabel: "Contact sales",
    ctaHref: "/login",
    highlighted: false,
  },
];

const faqs = [
  {
    question: "Can I start on the free plan and upgrade later?",
    answer:
      "Yes. Start with Starter to validate workflows, then move to Clinic or Growth as your team and volume increase.",
  },
  {
    question: "Does pricing include patient and provider workflows?",
    answer:
      "Yes. Every plan includes role-aware flows for both patients and providers, with higher plans adding deeper operational support.",
  },
  {
    question: "Do you support HIPAA-oriented controls?",
    answer:
      "The platform includes role-based access, row-level security, and audit logging foundations designed for HIPAA-oriented environments.",
  },
];

export const metadata: Metadata = {
  title: "Pricing | Health Stack",
  description:
    "Compare Health Stack plans for onboarding, scheduling, consultation, and clinical documentation workflows.",
};

export default function PricingPage() {
  return (
    <main
      className={`relative min-h-screen overflow-hidden bg-[#f8f4ef] text-slate-900 ${displayFont.variable} ${bodyFont.variable}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(6,182,212,0.2),transparent_32%),radial-gradient(circle_at_90%_10%,rgba(249,115,22,0.22),transparent_30%),radial-gradient(circle_at_50%_95%,rgba(15,23,42,0.14),transparent_45%)]" />

      <div className="relative mx-auto w-full max-w-6xl px-6 pb-16 pt-8 md:px-10">
        <header className="flex items-center justify-between rounded-full border border-slate-900/10 bg-white/70 px-5 py-3 backdrop-blur-sm">
          <Link
            href="/"
            className="font-[family-name:var(--font-display)] text-2xl tracking-wide text-cyan-900"
          >
            Health Stack
          </Link>
          <div className="flex items-center gap-2">
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

        <section className="pb-10 pt-14">
          <p className="inline-flex rounded-full border border-cyan-900/20 bg-cyan-900/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-900">
            Pricing
          </p>
          <h1 className="mt-4 font-[family-name:var(--font-display)] text-5xl leading-[0.95] md:text-6xl">
            Plans built around core care workflows.
          </h1>
          <p className="mt-4 max-w-2xl text-base text-slate-700">
            Choose the right foundation for onboarding, scheduling, encounter
            management, and documentation. Upgrade as your operational needs grow.
          </p>
        </section>

        <section className="grid gap-5 md:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`rounded-3xl border p-6 ${
                plan.highlighted
                  ? "border-cyan-900/30 bg-cyan-950 text-cyan-50 shadow-[0_24px_70px_-50px_rgba(15,23,42,0.9)]"
                  : "border-slate-900/10 bg-white/80 text-slate-900"
              }`}
            >
              <p
                className={`text-xs uppercase tracking-[0.2em] ${
                  plan.highlighted ? "text-cyan-200" : "text-slate-500"
                }`}
              >
                {plan.name}
              </p>
              <p className="mt-3 font-[family-name:var(--font-display)] text-4xl">
                {plan.price}
                <span className="ml-1 text-base font-[family-name:var(--font-body)]">
                  {plan.cadence}
                </span>
              </p>
              <p
                className={`mt-3 text-sm ${
                  plan.highlighted ? "text-cyan-100/90" : "text-slate-700"
                }`}
              >
                {plan.description}
              </p>
              <ul className="mt-5 space-y-2 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <span
                      className={`mt-1 h-1.5 w-1.5 rounded-full ${
                        plan.highlighted ? "bg-cyan-200" : "bg-cyan-900"
                      }`}
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={plan.ctaHref}
                className={`mt-6 inline-flex w-full justify-center rounded-full px-4 py-2 text-sm font-semibold transition ${
                  plan.highlighted
                    ? "bg-cyan-300 text-slate-950 hover:bg-cyan-200"
                    : "border border-slate-900/20 bg-white hover:border-cyan-900/50"
                }`}
              >
                {plan.ctaLabel}
              </Link>
            </article>
          ))}
        </section>

        <section className="mt-10 rounded-3xl border border-slate-900/10 bg-white/75 p-6 backdrop-blur-sm md:p-8">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Frequently asked
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {faqs.map((faq) => (
              <article
                key={faq.question}
                className="rounded-2xl border border-slate-900/10 bg-white p-4"
              >
                <h2 className="text-sm font-semibold text-slate-900">{faq.question}</h2>
                <p className="mt-2 text-sm text-slate-700">{faq.answer}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
