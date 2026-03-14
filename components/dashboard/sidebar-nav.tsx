"use client";

import { cn } from "@/lib/utils";
import {
  Building2,
  CalendarDays,
  ClipboardList,
  Hospital,
  LayoutDashboard,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type SidebarRole = "patient" | "provider" | "admin" | "unknown";

type DashboardSidebarNavProps = {
  role: SidebarRole;
  isAdmin: boolean;
};

type SidebarItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isVisible: boolean;
};

export function DashboardSidebarNav({ role, isAdmin }: DashboardSidebarNavProps) {
  const pathname = usePathname();

  const items: SidebarItem[] = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      isVisible: true,
    },
    {
      href: "/patient/appointments",
      label: "My Appointments",
      icon: CalendarDays,
      isVisible: role === "patient",
    },
    {
      href: "/patient/records",
      label: "My Records",
      icon: ClipboardList,
      isVisible: role === "patient",
    },
    {
      href: "/provider",
      label: "Provider Queue",
      icon: Hospital,
      isVisible: role === "provider",
    },
    {
      href: "/provider/patients",
      label: "Org Patients",
      icon: Users,
      isVisible: role === "provider",
    },
    {
      href: "/admin/patients",
      label: "All Patients",
      icon: Users,
      isVisible: isAdmin,
    },
    {
      href: "/organizations",
      label: "Organizations",
      icon: Building2,
      isVisible: isAdmin,
    },
  ];

  return (
    <nav className="rounded-2xl border border-slate-900/10 bg-white p-2">
      {items
        .filter((item) => item.isVisible)
        .map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "mb-1.5 flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition last:mb-0",
                isActive
                  ? "border-cyan-900 bg-cyan-900 text-white shadow-sm"
                  : "border-transparent text-slate-700 hover:border-cyan-900/20 hover:bg-cyan-900/10 hover:text-cyan-950",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
    </nav>
  );
}
