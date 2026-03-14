import { LogoutButton } from "@/components/logout-button";
import { getUserRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import Link from "next/link";
import { redirect } from "next/navigation";

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

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/login");
  }
  const role = getUserRole(data.user);

  return (
    <main
      className={`relative min-h-screen overflow-hidden bg-[#f8f4ef] text-slate-900 ${displayFont.variable} ${bodyFont.variable}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(6,182,212,0.16),transparent_34%),radial-gradient(circle_at_88%_15%,rgba(249,115,22,0.14),transparent_26%),radial-gradient(circle_at_50%_95%,rgba(15,23,42,0.1),transparent_40%)]" />

      <header className="relative px-5 pt-5">
        <div className="mx-auto flex min-h-16 w-full max-w-6xl flex-wrap items-center justify-between gap-3 rounded-full border border-slate-900/10 bg-white/70 px-5 py-3 backdrop-blur-sm">
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/dashboard"
              className="font-[family-name:var(--font-display)] text-xl tracking-wide text-cyan-900"
            >
              Health Stack
            </Link>
            <Link
              href="/patient/appointments"
              className="rounded-full px-3 py-1 text-xs text-slate-700 transition hover:bg-cyan-900/10 hover:text-cyan-950"
            >
              Appointments
            </Link>
            <Link
              href="/patient/records"
              className="rounded-full px-3 py-1 text-xs text-slate-700 transition hover:bg-cyan-900/10 hover:text-cyan-950"
            >
              Records
            </Link>
            {role === "provider" ? (
              <Link
                href="/provider"
                className="rounded-full px-3 py-1 text-xs text-slate-700 transition hover:bg-cyan-900/10 hover:text-cyan-950"
              >
                Provider queue
              </Link>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs text-slate-600 underline-offset-4 hover:underline"
            >
              Public landing
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>
      <section className="relative mx-auto w-full max-w-6xl p-5">{children}</section>
    </main>
  );
}
