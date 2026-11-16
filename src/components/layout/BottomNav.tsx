"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Package, ArrowUpRight, ClipboardList, History } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { label: "Beranda", href: "/", icon: Home },
    { label: "Barang", href: "/barang", icon: Package },
    { label: "Keluar", href: "/keluar", icon: ArrowUpRight, isCenter: true },
    { label: "Opname", href: "/opname", icon: ClipboardList },
    { label: "Riwayat", href: "/riwayat", icon: History },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-[var(--slate-200)] pb-[env(safe-area-inset-bottom,8px)] shadow-lg">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          if (item.isCenter) {
            return (
              <Link
                key={item.label}
                href={item.href}
                className="flex flex-col items-center justify-center -mt-5"
              >
                <div className="w-13 h-13 rounded-full bg-gradient-to-tr from-[var(--emerald-600)] to-[var(--emerald-500)] text-white flex items-center justify-center shadow-md shadow-[var(--emerald-600)]/30 border-4 border-white active:scale-95 transition-transform touch-target">
                  <Icon className="w-6 h-6 stroke-[2.5]" />
                </div>
                <span className="text-[10px] font-bold text-[var(--emerald-700)] mt-0.5">
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 py-1 touch-target transition-colors",
                isActive
                  ? "text-[var(--emerald-700)] font-bold"
                  : "text-[var(--slate-400)] hover:text-[var(--slate-700)]"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive && "text-[var(--emerald-600)] stroke-[2.4]")} />
              <span className="text-[10px] tracking-tight mt-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
