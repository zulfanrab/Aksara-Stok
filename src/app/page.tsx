import Link from "next/link";
import Image from "next/image";
import {
  ArrowUpRight,
  ArrowDownLeft,
  ClipboardList,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import {
  getItems,
  getCurrentStockMap,
  getStockTakes,
} from "@/lib/services/inventory";

export default async function Home() {
  const [items, stockMap, stockTakes] = await Promise.all([
    getItems(),
    getCurrentStockMap(),
    getStockTakes(),
  ]);

  // Saring sesi uji coba: hanya yang mengandung kata 'simulasi' (sesuai Butir 1)
  const operationalTakes = stockTakes.filter(
    (st) => !st.name.toLowerCase().includes("simulasi")
  );

  const activeOpname = operationalTakes.find(
    (st) => st.status === "COUNTING" || st.status === "REVIEW" || st.status === "DRAFT"
  );

  // Hitung barang habis dan menipis (baris kalibrasi ditiadakan sesuai Butir 3)
  let habisCount = 0;
  let menipisCount = 0;

  for (const item of items) {
    const currentStock = stockMap[item.id] || 0;
    if (currentStock <= 0) {
      habisCount++;
    } else if (item.min_stock !== null && item.min_stock !== undefined && currentStock <= item.min_stock) {
      menipisCount++;
    }
  }

  const needsAttention = habisCount > 0 || menipisCount > 0;

  // Tujuan tombol Mulai Hitung
  const opnameTargetUrl = activeOpname
    ? activeOpname.status === "COUNTING"
      ? `/opname/${activeOpname.id}/hitung`
      : `/opname/${activeOpname.id}`
    : "/opname";

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-slate-800 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-lg w-full mx-auto p-4 sm:p-6 space-y-5 pb-24 md:pb-12">
        {/* Header Identitas Ringkas */}
        <div className="flex items-center gap-3 pt-1">
          <div className="relative w-11 h-11 rounded-2xl overflow-hidden shadow-xs shrink-0 border border-slate-200 bg-slate-900">
            <Image
              src="/logo.webp"
              alt="Logo Aksara Stok"
              width={44}
              height={44}
              className="w-full h-full object-cover"
              priority
            />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight leading-tight">
              PT Aksara Riksa Perdana
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Aksara Stok &bull; Inventaris & Opname
            </p>
          </div>
        </div>

        {/* TIGA TOMBOL UTAMA (BESAR & JELAS, MIN 56 PX) */}
        <div className="space-y-3">
          {/* 1. Catat Keluar */}
          <Link
            href="/keluar"
            className="flex items-center justify-between p-4 sm:p-5 rounded-2xl bg-white border-2 border-slate-200 hover:border-emerald-600 shadow-xs hover:shadow-sm active:scale-98 touch-target transition-all min-h-[64px]"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <ArrowUpRight className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div className="text-left">
                <span className="text-base font-bold text-slate-900 block leading-tight">
                  Catat Keluar
                </span>
                <span className="text-xs text-slate-500 font-medium mt-0.5 block">
                  Barang diambil atau dipakai kerja
                </span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
          </Link>

          {/* 2. Catat Masuk */}
          <Link
            href="/masuk"
            className="flex items-center justify-between p-4 sm:p-5 rounded-2xl bg-white border-2 border-slate-200 hover:border-blue-600 shadow-xs hover:shadow-sm active:scale-98 touch-target transition-all min-h-[64px]"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                <ArrowDownLeft className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div className="text-left">
                <span className="text-base font-bold text-slate-900 block leading-tight">
                  Catat Masuk
                </span>
                <span className="text-xs text-slate-500 font-medium mt-0.5 block">
                  Pembelian barang baru dari supplier
                </span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
          </Link>

          {/* 3. Mulai Hitung (Stock Opname) */}
          <Link
            href={opnameTargetUrl}
            className="flex items-center justify-between p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[var(--emerald-600)] to-[var(--emerald-700)] text-white shadow-sm hover:from-[var(--emerald-700)] hover:to-[var(--emerald-700)] active:scale-98 touch-target transition-all min-h-[64px]"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-white/20 text-white flex items-center justify-center shrink-0">
                <ClipboardList className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div className="text-left">
                <span className="text-base font-bold text-white block leading-tight">
                  {activeOpname ? "Lanjutkan Hitung" : "Mulai Hitung"}
                </span>
                <span className="text-xs text-emerald-100 font-medium mt-0.5 block">
                  {activeOpname ? activeOpname.name : "Stock opname fisik di gudang"}
                </span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-emerald-200 shrink-0" />
          </Link>
        </div>

        {/* SATU KARTU TUNGGAL "PERLU PERHATIAN" */}
        {needsAttention ? (
          <div className="bg-white rounded-2xl p-4 sm:p-5 border-2 border-amber-300 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <h2 className="text-xs font-bold uppercase tracking-wider">
                Perlu Perhatian
              </h2>
            </div>

            <div className="space-y-2">
              {habisCount > 0 && (
                <Link
                  href="/barang?filter=HABIS"
                  className="flex items-center justify-between p-3 rounded-xl bg-rose-50 border border-rose-200 hover:bg-rose-100/70 text-rose-900 touch-target transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shrink-0" />
                    <span className="text-xs font-semibold">Barang Habis</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-bold text-xs num-mono text-rose-700">
                    <span>{habisCount} barang</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </Link>
              )}

              {menipisCount > 0 && (
                <Link
                  href="/barang?filter=MENIPIS"
                  className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-200 hover:bg-amber-100/70 text-amber-900 touch-target transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                    <span className="text-xs font-semibold">Stok Menipis</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-bold text-xs num-mono text-amber-800">
                    <span>{menipisCount} barang</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-900 font-semibold text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>Semua stok aman.</span>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
