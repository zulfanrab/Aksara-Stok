"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Package,
  PlusCircle,
  ClipboardList,
  MoreHorizontal,
  ArrowUpRight,
  ArrowDownLeft,
  FileText,
  Users,
  History,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();
  const [sheet, setSheet] = useState<"catat" | "lainnya" | null>(null);

  const isBarang = pathname.startsWith("/barang");
  const isOpname = pathname.startsWith("/opname");
  const isHome = pathname === "/";
  const isCatat = pathname === "/keluar" || pathname === "/masuk";
  const isLainnya = pathname === "/laporan" || pathname === "/karyawan" || pathname === "/riwayat";

  return (
    <>
      {/* 5 Menu Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 pb-[env(safe-area-inset-bottom,8px)] shadow-lg">
        <div className="flex items-center justify-around h-16 px-1">
          {/* 1. Beranda */}
          <Link
            href="/"
            onClick={() => setSheet(null)}
            className={cn(
              "flex flex-col items-center justify-center flex-1 py-1 touch-target transition-colors",
              isHome
                ? "text-emerald-700 font-bold"
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            <Home className={cn("w-5 h-5", isHome && "text-emerald-600 stroke-[2.5]")} />
            <span className="text-[10px] tracking-tight mt-1">Beranda</span>
          </Link>

          {/* 2. Barang */}
          <Link
            href="/barang"
            onClick={() => setSheet(null)}
            className={cn(
              "flex flex-col items-center justify-center flex-1 py-1 touch-target transition-colors",
              isBarang
                ? "text-emerald-700 font-bold"
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            <Package className={cn("w-5 h-5", isBarang && "text-emerald-600 stroke-[2.5]")} />
            <span className="text-[10px] tracking-tight mt-1">Barang</span>
          </Link>

          {/* 3. Catat (Tombol Utama Tengah - Membuka Pilihan Keluar/Masuk) */}
          <button
            type="button"
            onClick={() => setSheet((prev) => (prev === "catat" ? null : "catat"))}
            className="flex flex-col items-center justify-center -mt-5 flex-1 touch-target group"
            aria-label="Catat Keluar atau Masuk"
          >
            <div
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center shadow-md border-4 border-white active:scale-95 transition-transform",
                sheet === "catat" || isCatat
                  ? "bg-emerald-700 text-white shadow-emerald-700/40"
                  : "bg-emerald-600 text-white shadow-emerald-600/30"
              )}
            >
              <PlusCircle className="w-6 h-6 stroke-[2.4]" />
            </div>
            <span
              className={cn(
                "text-[10px] mt-0.5",
                sheet === "catat" || isCatat
                  ? "text-emerald-800 font-bold"
                  : "text-slate-600 font-semibold"
              )}
            >
              Catat
            </span>
          </button>

          {/* 4. Opname */}
          <Link
            href="/opname"
            onClick={() => setSheet(null)}
            className={cn(
              "flex flex-col items-center justify-center flex-1 py-1 touch-target transition-colors",
              isOpname
                ? "text-emerald-700 font-bold"
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            <ClipboardList className={cn("w-5 h-5", isOpname && "text-emerald-600 stroke-[2.5]")} />
            <span className="text-[10px] tracking-tight mt-1">Opname</span>
          </Link>

          {/* 5. Lainnya (Membuka Submenu: Laporan, Karyawan, Riwayat) */}
          <button
            type="button"
            onClick={() => setSheet((prev) => (prev === "lainnya" ? null : "lainnya"))}
            className={cn(
              "flex flex-col items-center justify-center flex-1 py-1 touch-target transition-colors",
              sheet === "lainnya" || isLainnya
                ? "text-emerald-700 font-bold"
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            <MoreHorizontal
              className={cn("w-5 h-5", (sheet === "lainnya" || isLainnya) && "text-emerald-600 stroke-[2.5]")}
            />
            <span className="text-[10px] tracking-tight mt-1">Lainnya</span>
          </button>
        </div>
      </nav>

      {/* Sheet Modal Pilihan "Catat" */}
      {sheet === "catat" && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex flex-col justify-end p-3 animate-in fade-in duration-150"
          onClick={() => setSheet(null)}
        >
          <div
            className="bg-white rounded-3xl p-5 space-y-3.5 shadow-2xl border border-slate-200 animate-in slide-in-from-bottom duration-200 mb-16"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Pilih Aksi Pencatatan</h3>
              <button
                type="button"
                onClick={() => setSheet(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/keluar"
                onClick={() => setSheet(null)}
                className="p-4 rounded-2xl bg-emerald-50/70 border-2 border-emerald-300 hover:bg-emerald-100/70 flex flex-col items-center text-center space-y-2 touch-target transition-all active:scale-98"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <ArrowUpRight className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-900 block leading-tight">Catat Keluar</span>
                  <span className="text-[11px] text-slate-600 block mt-0.5">Dipakai kerja</span>
                </div>
              </Link>

              <Link
                href="/masuk"
                onClick={() => setSheet(null)}
                className="p-4 rounded-2xl bg-blue-50/70 border-2 border-blue-300 hover:bg-blue-100/70 flex flex-col items-center text-center space-y-2 touch-target transition-all active:scale-98"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <ArrowDownLeft className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-900 block leading-tight">Catat Masuk</span>
                  <span className="text-[11px] text-slate-600 block mt-0.5">Belanja baru</span>
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Sheet Modal Pilihan "Lainnya" */}
      {sheet === "lainnya" && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex flex-col justify-end p-3 animate-in fade-in duration-150"
          onClick={() => setSheet(null)}
        >
          <div
            className="bg-white rounded-3xl p-5 space-y-2.5 shadow-2xl border border-slate-200 animate-in slide-in-from-bottom duration-200 mb-16"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Menu Lainnya</h3>
              <button
                type="button"
                onClick={() => setSheet(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <Link
                href="/laporan"
                onClick={() => setSheet(null)}
                className="flex items-center gap-3.5 p-3 rounded-xl hover:bg-slate-50 border border-slate-100 transition-colors touch-target"
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="text-sm font-bold text-slate-900 block">Laporan & Audit</span>
                  <span className="text-xs text-slate-500">Rekap stok, pemakaian, dan ekspor</span>
                </div>
              </Link>

              <Link
                href="/karyawan"
                onClick={() => setSheet(null)}
                className="flex items-center gap-3.5 p-3 rounded-xl hover:bg-slate-50 border border-slate-100 transition-colors touch-target"
              >
                <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="text-sm font-bold text-slate-900 block">Pengguna Barang</span>
                  <span className="text-xs text-slate-500">Daftar nama karyawan lapangan</span>
                </div>
              </Link>

              <Link
                href="/riwayat"
                onClick={() => setSheet(null)}
                className="flex items-center gap-3.5 p-3 rounded-xl hover:bg-slate-50 border border-slate-100 transition-colors touch-target"
              >
                <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                  <History className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="text-sm font-bold text-slate-900 block">Riwayat Mutasi</span>
                  <span className="text-xs text-slate-500">Log lengkap keluar, masuk, dan koreksi</span>
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
