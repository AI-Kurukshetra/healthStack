import { DashboardSidebarNav } from "@/components/dashboard/sidebar-nav";
import { LogoutButton } from "@/components/logout-button";
import { getUserRole, isPlatformAdmin } from "@/lib/auth/roles";
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
  const isAdmin = isPlatformAdmin(data.user);
  const userEmail = data.user.email ?? "Signed-in user";

  return (
    <main
      className={`relative min-h-screen overflow-hidden bg-[#f8f4ef] text-slate-900 ${displayFont.variable} ${bodyFont.variable}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(6,182,212,0.16),transparent_34%),radial-gradient(circle_at_88%_15%,rgba(249,115,22,0.14),transparent_26%),radial-gradient(circle_at_50%_95%,rgba(15,23,42,0.1),transparent_40%)]" />

      <section className="relative mx-auto w-full max-w-7xl p-4 md:p-5">
        <div className="lg:pl-[276px]">
          <aside className="hidden rounded-3xl border border-slate-900/10 bg-white/75 p-4 backdrop-blur-sm lg:fixed lg:top-5 lg:z-20 lg:flex lg:h-[calc(100svh-2.5rem)] lg:w-[260px] lg:flex-col">
            <div className="rounded-2xl border border-slate-900/10 bg-white px-3 py-3">
              <div className="space-y-1">
                <Link
                  href="/dashboard"
                  className="inline-block font-[family-name:var(--font-display)] text-2xl tracking-wide text-cyan-900"
                >
                  Health Stack
                </Link>
                <p className="text-xs text-slate-500">{userEmail}</p>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  {isAdmin ? "Platform Admin" : role}
                </p>
              </div>
            </div>

            <div className="mt-5 lg:flex-1">
              <DashboardSidebarNav role={role} isAdmin={isAdmin} />
            </div>

            <div className="mt-5 border-t border-slate-900/10 pt-4 lg:mt-auto">
              <LogoutButton className="w-full bg-cyan-900 text-white hover:bg-cyan-800" />
            </div>
          </aside>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-900/10 bg-white/65 px-4 py-3 backdrop-blur-sm lg:hidden">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Menu</p>
              <div className="mt-2">
                <DashboardSidebarNav role={role} isAdmin={isAdmin} />
              </div>
              <div className="mt-3 border-t border-slate-900/10 pt-3">
                <LogoutButton className="w-full bg-cyan-900 text-white hover:bg-cyan-800" />
              </div>
            </div>
            <section>{children}</section>
          </div>
        </div>
      </section>
    </main>
  );
}
