"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { HelpCircle } from "lucide-react";
import { OfflineStatusBanner } from "./OfflineStatusBanner";
import { NavbarStatusPill } from "./NavbarStatusPill";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Beranda" },
  { href: "/barang", label: "Barang" },
  { href: "/keluar", label: "Catat Keluar" },
  { href: "/masuk", label: "Catat Masuk" },
  { href: "/opname", label: "Opname" },
  { href: "/laporan", label: "Laporan" },
  { href: "/karyawan", label: "Karyawan" },
  { href: "/riwayat", label: "Riwayat" },
];

export function Navbar() {
  const pathname = usePathname();

  const isLinkActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-2xs">
      {/* Garis Aksen Emas Sesuai Bagian 9 Blueprint */}
      <div className="h-1 bg-gradient-to-r from-[var(--gold-light)] via-[var(--gold-main)] to-[var(--gold-shadow)]" />

      {/* Banner status offline & sinkronisasi */}
      <OfflineStatusBanner />

      <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative w-9 h-9 rounded-xl overflow-hidden shadow-2xs shrink-0 border border-slate-200 bg-slate-900 group-hover:border-emerald-600 transition-colors">
            <Image
              src="/logo.webp"
              alt="Logo Aksara Stok"
              width={36}
              height={36}
              className="w-full h-full object-cover"
              priority
            />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 tracking-tight leading-tight group-hover:text-emerald-800 transition-colors">
              PT Aksara Riksa Perdana
            </h1>
            <p className="text-[11px] text-slate-500 font-semibold">
              Aksara Stok &bull; Opname & Inventaris
            </p>
          </div>
        </Link>

        {/* Status indicator & Panduan on mobile & desktop */}
        <div className="flex items-center gap-2">
          <NavbarStatusPill />

          {/* Tombol Panduan (?) Selalu Terlihat di Semua Layar */}
          <Link
            href="/panduan"
            className={cn(
              "inline-flex items-center justify-center w-8 h-8 rounded-xl border transition-all shadow-2xs touch-target",
              pathname === "/panduan"
                ? "bg-gradient-to-r from-emerald-600 to-emerald-700 text-white border-emerald-700 shadow-xs"
                : "bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border-slate-200"
            )}
            title="Buka Panduan Aplikasi"
            aria-label="Panduan Aplikasi"
          >
            <HelpCircle className="w-4 h-4 stroke-[2.3]" />
          </Link>

          {/* Desktop Navigation Links dengan Tab Aktif Berwarna Hijau K3 Aksara */}
          <nav className="hidden md:flex items-center gap-1 ml-2">
            {NAV_ITEMS.map((item) => {
              const active = isLinkActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "px-2.5 lg:px-3 py-1.5 rounded-xl text-xs lg:text-sm font-bold transition-all shrink-0",
                    active
                      ? "bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-sm border border-emerald-700/60"
                      : "text-slate-600 hover:text-emerald-800 hover:bg-emerald-50/80 font-medium"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
