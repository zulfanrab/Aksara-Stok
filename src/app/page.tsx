import Link from "next/link";
import {
  ArrowUpRight,
  ArrowDownLeft,
  ClipboardList,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Package,
  Clock,
  ArrowRight,
  BarChart3,
  Users,
  FileText,
  RotateCcw,
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import {
  getItems,
  getCurrentStockMap,
  getStockTakes,
  getMovements,
} from "@/lib/services/inventory";

export default async function Home() {
  const [items, stockMap, stockTakes, recentMovements] = await Promise.all([
    getItems(),
    getCurrentStockMap(),
    getStockTakes(),
    getMovements(5),
  ]);

  // Saring sesi uji coba: hanya yang namanya mengandung kata 'simulasi' (sesuai Butir 1)
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

  const amanCount = Math.max(0, items.length - habisCount - menipisCount);
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

      {/* =========================================================================
          1. TAMPILAN MOBILE (< lg) - 100% PERSIS, TIDAK BERUBAH
          ========================================================================= */}
      <main className="lg:hidden flex-1 max-w-lg w-full mx-auto p-4 sm:p-6 space-y-5 pb-24 md:pb-12 pt-2 sm:pt-4">
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
            className="flex items-center justify-between p-4 sm:p-5 rounded-2xl bg-white border-2 border-emerald-600 hover:border-emerald-700 shadow-xs hover:shadow-sm active:scale-98 touch-target transition-all min-h-[64px]"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <ClipboardList className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div className="text-left">
                <span className="text-base font-bold text-slate-900 block leading-tight">
                  {activeOpname ? "Lanjutkan Hitung" : "Mulai Hitung"}
                </span>
                <span className="text-xs text-slate-600 font-medium mt-0.5 block">
                  {activeOpname ? activeOpname.name : "Stock opname fisik di gudang"}
                </span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-emerald-700 shrink-0" />
          </Link>
        </div>

        {/* SATU KARTU TUNGGAL "PERLU PERHATIAN" */}
        {needsAttention ? (
          <div className="bg-white rounded-2xl p-4 sm:p-5 border-2 border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-slate-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Perlu Perhatian
              </h2>
            </div>

            <div className="space-y-2">
              {habisCount > 0 && (
                <Link
                  href="/barang?filter=HABIS"
                  className="flex items-center justify-between p-3.5 rounded-xl bg-rose-50 border border-rose-200 hover:bg-rose-100/80 text-rose-950 touch-target transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shrink-0" />
                    <span className="text-sm font-bold text-rose-950">Barang Habis</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-bold text-xs num-mono text-rose-950">
                    <span>{habisCount} barang</span>
                    <ChevronRight className="w-4 h-4 text-rose-700" />
                  </div>
                </Link>
              )}

              {menipisCount > 0 && (
                <Link
                  href="/barang?filter=MENIPIS"
                  className="flex items-center justify-between p-3.5 rounded-xl bg-amber-50 border border-amber-200 hover:bg-amber-100/80 text-amber-950 touch-target transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-600 shrink-0" />
                    <span className="text-sm font-bold text-amber-950">Stok Menipis</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-bold text-xs num-mono text-amber-950">
                    <span>{menipisCount} barang</span>
                    <ChevronRight className="w-4 h-4 text-amber-800" />
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

      {/* =========================================================================
          2. TAMPILAN DESKTOP (>= lg) - LEBIH LUAS, RINCI & LENGKAP (DASHBOARD)
          ========================================================================= */}
      <main className="hidden lg:block flex-1 max-w-6xl w-full mx-auto p-6 space-y-6 pb-12 pt-4">
        {/* Header Desktop */}
        <div className="flex items-center justify-between pb-1 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Dashboard Inventaris & Gudang
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              PT Aksara Riksa Perdana &bull; Pemantauan operasional, pergerakan barang, dan audit fisik
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/laporan"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs touch-target transition-colors"
            >
              <BarChart3 className="w-4 h-4 text-emerald-700" />
              <span>Lihat Laporan</span>
            </Link>
            <Link
              href="/panduan"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs touch-target transition-colors"
            >
              <FileText className="w-4 h-4 text-slate-500" />
              <span>Panduan</span>
            </Link>
          </div>
        </div>

        {/* 4 Kartu Metrik Ringkasan Eksekutif Desktop */}
        <div className="grid grid-cols-4 gap-4">
          {/* Card 1: Total Barang */}
          <Link
            href="/barang"
            className="p-4 rounded-2xl bg-white border-2 border-slate-200 hover:border-slate-300 shadow-xs transition-all hover:shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Master Barang
              </span>
              <Package className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900 num-mono">
              {items.length} <span className="text-xs font-semibold text-slate-500">Barang</span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium block mt-1">
              Semua kategori terdaftar
            </span>
          </Link>

          {/* Card 2: Stok Aman */}
          <div className="p-4 rounded-2xl bg-white border-2 border-emerald-200/80 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                Stok Aman
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-emerald-900 num-mono">
              {amanCount} <span className="text-xs font-semibold text-emerald-700">Barang</span>
            </div>
            <span className="text-[11px] text-emerald-600 font-medium block mt-1">
              Di atas batas minimum
            </span>
          </div>

          {/* Card 3: Stok Menipis */}
          <Link
            href="/barang?filter=MENIPIS"
            className="p-4 rounded-2xl bg-white border-2 border-amber-200 hover:border-amber-300 shadow-xs transition-all hover:shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                Stok Menipis
              </span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-amber-900 num-mono">
              {menipisCount} <span className="text-xs font-semibold text-amber-700">Barang</span>
            </div>
            <span className="text-[11px] text-amber-600 font-medium block mt-1">
              Perlu restock segera
            </span>
          </Link>

          {/* Card 4: Stok Habis */}
          <Link
            href="/barang?filter=HABIS"
            className="p-4 rounded-2xl bg-white border-2 border-rose-200 hover:border-rose-300 shadow-xs transition-all hover:shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">
                Stok Habis (0)
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-rose-900 num-mono">
              {habisCount} <span className="text-xs font-semibold text-rose-700">Barang</span>
            </div>
            <span className="text-[11px] text-rose-600 font-medium block mt-1">
              Saldo fisik kosong
            </span>
          </Link>
        </div>

        {/* Grid 2 Kolom Desktop: Kolom Kiri (Aksi & Opname) vs Kolom Kanan (Aktivitas & Riwayat) */}
        <div className="grid grid-cols-12 gap-6 items-start">
          {/* KOLOM KIRI (5 Kolom): Aksi Cepat Operasional */}
          <div className="col-span-5 space-y-4">
            <div className="bg-white rounded-2xl p-5 border-2 border-slate-200 shadow-xs space-y-3.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Aksi Cepat Operasional
              </h2>

              <div className="space-y-3">
                {/* 1. Catat Keluar */}
                <Link
                  href="/keluar"
                  className="flex items-center justify-between p-4 rounded-xl bg-slate-50 hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-500 text-slate-900 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                      <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-slate-900 block leading-tight group-hover:text-emerald-800">
                        Catat Keluar
                      </span>
                      <span className="text-xs text-slate-500">
                        Barang diambil untuk kerja
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-700" />
                </Link>

                {/* 2. Catat Masuk */}
                <Link
                  href="/masuk"
                  className="flex items-center justify-between p-4 rounded-xl bg-slate-50 hover:bg-blue-50/60 border border-slate-200 hover:border-blue-500 text-slate-900 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
                      <ArrowDownLeft className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-slate-900 block leading-tight group-hover:text-blue-800">
                        Catat Masuk
                      </span>
                      <span className="text-xs text-slate-500">
                        Pembelian baru dari supplier
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-700" />
                </Link>

                {/* 3. Mulai Hitung */}
                <Link
                  href={opnameTargetUrl}
                  className="flex items-center justify-between p-4 rounded-xl bg-slate-50 hover:bg-emerald-50 border-2 border-emerald-600 text-slate-900 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <ClipboardList className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-slate-900 block leading-tight group-hover:text-emerald-800">
                        {activeOpname ? "Lanjutkan Hitung" : "Mulai Hitung"}
                      </span>
                      <span className="text-xs text-slate-500">
                        {activeOpname ? activeOpname.name : "Stock opname fisik di gudang"}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-emerald-700" />
                </Link>
              </div>
            </div>

            {/* Status Sesi Opname Aktif */}
            <div className="bg-white rounded-2xl p-5 border-2 border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Status Stock Opname
                </h3>
                {activeOpname ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-800 text-[11px] font-bold border border-sky-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-600 animate-pulse" />
                    Aktif
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400 font-semibold">Tidak ada sesi</span>
                )}
              </div>

              {activeOpname ? (
                <div className="space-y-3 pt-1">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{activeOpname.name}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Cut-off: {new Date(activeOpname.cutoff_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">Progres Fisik:</span>
                    <span className="font-bold text-slate-900 num-mono">
                      {activeOpname.counted_count || 0} dari {activeOpname.lines_count || 0} barang
                    </span>
                  </div>
                  <Link
                    href={opnameTargetUrl}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Buka Sesi Opname</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ) : (
                <p className="text-xs text-slate-500 leading-relaxed">
                  Belum ada sesi stock opname fisik yang aktif. Anda dapat membuka sesi baru kapan saja melalui menu Opname.
                </p>
              )}
            </div>
          </div>

          {/* KOLOM KANAN (7 Kolom): Aktivitas Pergerakan Stok Terkini */}
          <div className="col-span-7 space-y-4">
            <div className="bg-white rounded-2xl p-5 border-2 border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                    Pergerakan Stok Terakhir
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Catatan transaksi mutasi barang terbaru
                  </p>
                </div>
                <Link
                  href="/riwayat"
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors"
                >
                  <span>Lihat Semua</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {recentMovements.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Belum ada pergerakan stok tercatat.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {recentMovements.map((mov) => {
                    const isOut = mov.type === "OUT";
                    const isIn = mov.type === "IN";
                    const isReversal = mov.type === "REVERSAL";

                    const badgeColor = isOut
                      ? "bg-sky-50 text-sky-800 border-sky-200"
                      : isIn
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : isReversal
                      ? "bg-rose-50 text-rose-800 border-rose-200"
                      : "bg-indigo-50 text-indigo-800 border-indigo-200";

                    const typeLabel = isOut
                      ? "Keluar"
                      : isIn
                      ? "Masuk"
                      : isReversal
                      ? "Koreksi"
                      : "Penyesuaian";

                    const dateStr = new Date(mov.occurred_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <div key={mov.id} className="py-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border shrink-0 ${badgeColor}`}>
                            {typeLabel}
                          </span>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-900 block truncate">
                              {mov.item?.name || "Barang"}
                            </span>
                            <span className="text-[11px] text-slate-500 block truncate">
                              {mov.person?.name ? `Oleh: ${mov.person.name}` : mov.note || dateStr} &bull; {dateStr}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-bold text-slate-900 num-mono">
                            {isIn ? `+${mov.qty}` : isOut ? `-${mov.qty}` : mov.qty} {mov.item?.unit?.name || ""}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pintasan Menu Administrasi */}
            <div className="grid grid-cols-3 gap-3">
              <Link
                href="/laporan"
                className="p-3.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-600 shadow-2xs transition-all text-left group"
              >
                <BarChart3 className="w-5 h-5 text-emerald-700 mb-1.5" />
                <span className="text-xs font-bold text-slate-900 block group-hover:text-emerald-800">
                  Laporan & Rekap
                </span>
                <span className="text-[11px] text-slate-500">
                  Ekspor Excel & cetak
                </span>
              </Link>

              <Link
                href="/karyawan"
                className="p-3.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-600 shadow-2xs transition-all text-left group"
              >
                <Users className="w-5 h-5 text-emerald-700 mb-1.5" />
                <span className="text-xs font-bold text-slate-900 block group-hover:text-emerald-800">
                  Data Karyawan
                </span>
                <span className="text-[11px] text-slate-500">
                  Daftar pemakai barang
                </span>
              </Link>

              <Link
                href="/riwayat"
                className="p-3.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-600 shadow-2xs transition-all text-left group"
              >
                <RotateCcw className="w-5 h-5 text-emerald-700 mb-1.5" />
                <span className="text-xs font-bold text-slate-900 block group-hover:text-emerald-800">
                  Riwayat Mutasi
                </span>
                <span className="text-[11px] text-slate-500">
                  Jurnal lengkap & koreksi
                </span>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
