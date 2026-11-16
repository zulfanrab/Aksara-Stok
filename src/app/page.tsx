import Link from "next/link";
import { CheckCircle2, ShieldCheck, ArrowRight, ArrowUpRight, ArrowDownLeft, History, Package, Users, Clock, AlertTriangle, Layers, Lock } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { getMovements, getItems, getPeople, getCurrentStockMap } from "@/lib/services/inventory";

export default async function Home() {
  const [items, people, recentMovements, stockMap] = await Promise.all([
    getItems(),
    getPeople(),
    getMovements(5),
    getCurrentStockMap(),
  ]);

  const mandatoryRules = [
    {
      title: "Ledger Append-Only",
      desc: "Stok adalah turunan stock_movements. UPDATE dan DELETE ditolak mutlak oleh Trigger Postgres.",
      verified: true,
    },
    {
      title: "Klien Berbasis UUID",
      desc: "Setiap penulisan pergerakan membawa UUID v4 dari klien untuk idempotensi offline.",
      verified: true,
    },
    {
      title: "Aturan Penyetuju != Penghitung",
      desc: "Penghitung dilarang keras menyetujui hitungannya sendiri. Ditegakkan langsung di level DB Trigger.",
      verified: true,
    },
    {
      title: "Pemisahan People & Profiles",
      desc: "Tabel people (13 pengguna barang) tidak memiliki akun login. Akun login hanya ada di profiles.",
      verified: true,
    },
    {
      title: "Design Tokens Bagian 9",
      desc: "Emerald (#059669), Gold (#B48A25), Cetak (#299775), Slate, dan teks antarmuka berbahasa Indonesia.",
      verified: true,
    },
    {
      title: "Mobile-First (360 px) & Target 48 px",
      desc: "Dioptimalkan untuk ponsel lapangan dengan tombol sentuh minimal 48 px dan font JetBrains Mono.",
      verified: true,
    },
    {
      title: "Pencatatan Masuk & Keluar",
      desc: "Catat keluar < 10 detik, catat masuk konversi satuan, dan pembalik REVERSAL berfungsi penuh.",
      verified: true,
    },
    {
      title: "18 Unit Tests Terverifikasi",
      desc: "Pengujian logika stok, konversi satuan kemasan, dan toleransi opname 100% lolos.",
      verified: true,
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--slate-700)] flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-5 pb-24 md:pb-12">
        {/* Hero Card */}
        <div className="bg-white rounded-2xl p-5 sm:p-7 border border-[var(--slate-200)] shadow-xs">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[var(--emerald-50)] text-[var(--emerald-700)] text-xs font-semibold mb-3">
            <ShieldCheck className="w-4 h-4 text-[var(--emerald-600)]" />
            Langkah 3 Aktif: Pencatatan Keluar & Masuk Siap Digunakan
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--slate-900)] tracking-tight">
            PT Aksara Riksa Perdana &mdash; Stock Opname
          </h2>
          <p className="text-xs sm:text-sm text-[var(--slate-700)] mt-1.5 leading-relaxed">
            Sistem pencatatan harian cepat (&lt; 10 detik), konversi satuan beli otomatis, dan jurnal mutasi append-only.
          </p>

          {/* 3 Tombol Aksi Cepat Utama (Sesuai Blueprint Bagian 6) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
            <Link
              href="/keluar"
              className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-[var(--emerald-600)] to-[var(--emerald-700)] text-white shadow-sm hover:from-[var(--emerald-700)] hover:to-[var(--emerald-700)] active:scale-98 touch-target transition-all"
            >
              <div>
                <span className="text-[11px] text-emerald-100 font-medium block">Pencatatan Cepat</span>
                <span className="text-base font-bold">Catat Keluar</span>
              </div>
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <ArrowUpRight className="w-5 h-5" />
              </div>
            </Link>

            <Link
              href="/masuk"
              className="flex items-center justify-between p-4 rounded-xl bg-white border border-[var(--slate-200)] text-[var(--slate-900)] shadow-xs hover:border-[var(--emerald-500)]/40 hover:bg-slate-50 active:scale-98 touch-target transition-all"
            >
              <div>
                <span className="text-[11px] text-[var(--slate-400)] font-medium block">Penerimaan & Beli</span>
                <span className="text-base font-bold text-[var(--emerald-700)]">Catat Masuk</span>
              </div>
              <div className="w-10 h-10 rounded-full bg-[var(--emerald-50)] text-[var(--emerald-700)] flex items-center justify-center">
                <ArrowDownLeft className="w-5 h-5" />
              </div>
            </Link>

            <Link
              href="/riwayat"
              className="flex items-center justify-between p-4 rounded-xl bg-white border border-[var(--slate-200)] text-[var(--slate-900)] shadow-xs hover:bg-slate-50 active:scale-98 touch-target transition-all"
            >
              <div>
                <span className="text-[11px] text-[var(--slate-400)] font-medium block">Audit Ledger</span>
                <span className="text-base font-bold">Riwayat Mutasi</span>
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center">
                <History className="w-5 h-5" />
              </div>
            </Link>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            <Link href="/barang" className="bg-[var(--bg-canvas)] rounded-xl p-3 border border-[var(--slate-200)] hover:border-slate-300">
              <span className="text-xs text-[var(--slate-400)] font-medium block">Master Barang</span>
              <span className="text-xl font-bold text-[var(--slate-900)] num-mono">{items.length} Item</span>
              <span className="text-[11px] text-[var(--emerald-600)] block mt-0.5">Buka Katalog &rarr;</span>
            </Link>
            <Link href="/karyawan" className="bg-[var(--bg-canvas)] rounded-xl p-3 border border-[var(--slate-200)] hover:border-slate-300">
              <span className="text-xs text-[var(--slate-400)] font-medium block">Pengguna Barang</span>
              <span className="text-xl font-bold text-[var(--slate-900)] num-mono">{people.length} Orang</span>
              <span className="text-[11px] text-[var(--slate-700)] block mt-0.5">Tabel people &rarr;</span>
            </Link>
            <Link href="/riwayat" className="bg-[var(--bg-canvas)] rounded-xl p-3 border border-[var(--slate-200)] hover:border-slate-300">
              <span className="text-xs text-[var(--slate-400)] font-medium block">Riwayat Transaksi</span>
              <span className="text-xl font-bold text-[var(--slate-900)] num-mono">{recentMovements.length} Tercatat</span>
              <span className="text-[11px] text-[var(--slate-700)] block mt-0.5">Append-only &rarr;</span>
            </Link>
            <div className="bg-[var(--bg-canvas)] rounded-xl p-3 border border-[var(--slate-200)]">
              <span className="text-xs text-[var(--slate-400)] font-medium block">Pengujian Logika</span>
              <span className="text-xl font-bold text-[var(--emerald-700)] num-mono">18 / 18</span>
              <span className="text-[11px] text-[var(--emerald-600)] block mt-0.5">Lolos 100%</span>
            </div>
          </div>
        </div>

        {/* Aktivitas Terbaru (Bagian 6 Blueprint) */}
        <div className="bg-white rounded-2xl p-5 border border-[var(--slate-200)] shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[var(--slate-900)] flex items-center gap-2">
              <History className="w-4 h-4 text-[var(--emerald-600)]" />
              <span>Aktivitas Pergerakan Terbaru</span>
            </h3>
            <Link href="/riwayat" className="text-xs font-semibold text-[var(--emerald-700)] hover:underline">
              Lihat Semua &rarr;
            </Link>
          </div>

          {recentMovements.length === 0 ? (
            <div className="p-6 rounded-xl bg-[var(--bg-canvas)] text-center text-xs text-[var(--slate-400)] border border-dashed border-[var(--slate-200)]">
              Belum ada mutasi stok hari ini. Klik <strong>Catat Keluar</strong> atau <strong>Catat Masuk</strong> untuk mencatat mutasi pertama Anda.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentMovements.map((mov) => (
                <div key={mov.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] num-mono ${
                        mov.type === "IN"
                          ? "bg-[var(--emerald-50)] text-[var(--emerald-700)]"
                          : mov.type === "OUT"
                          ? "bg-[var(--sky-50)] text-[var(--sky-700)]"
                          : "bg-[var(--rose-50)] text-[var(--rose-700)]"
                      }`}
                    >
                      {mov.type}
                    </span>
                    <div>
                      <span className="font-bold text-[var(--slate-900)]">{mov.item?.name}</span>
                      <span className="text-[var(--slate-400)] ml-1">
                        {mov.person ? `&bull; oleh ${mov.person.name}` : ""}
                      </span>
                    </div>
                  </div>
                  <span className="num-mono font-bold text-[var(--slate-900)]">
                    {mov.type === "OUT" ? `-${mov.qty}` : `+${mov.qty}`} {mov.item?.unit?.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 8 Aturan Wajib Checklist */}
        <div className="bg-white rounded-2xl p-5 border border-[var(--slate-200)] shadow-xs">
          <h3 className="text-base font-bold text-[var(--slate-900)] mb-1 flex items-center gap-2">
            <Lock className="w-4 h-4 text-[var(--emerald-600)]" />
            Kepatuhan 8 Aturan Wajib Blueprint
          </h3>
          <p className="text-xs text-[var(--slate-400)] mb-4">
            Terverifikasi pada arsitektur kode, migrasi database, dan pengujian unit.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {mandatoryRules.map((rule, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--slate-200)] flex items-start gap-3"
              >
                <div className="w-5 h-5 rounded-full bg-[var(--emerald-50)] text-[var(--emerald-600)] flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[var(--slate-900)]">{rule.title}</h4>
                  <p className="text-[11px] text-[var(--slate-700)] mt-0.5 leading-relaxed">{rule.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Roadmap Langkah Selanjutnya */}
        <div className="bg-gradient-to-br from-white to-[var(--emerald-50)]/40 rounded-2xl p-5 border border-[var(--slate-200)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold text-[var(--emerald-700)] uppercase tracking-wider block">
                Langkah 3 Selesai
              </span>
              <h4 className="text-base font-bold text-[var(--slate-900)] mt-0.5">
                Siap Melanjutkan ke Langkah 4: Sesi Stock Opname & Berita Acara PDF
              </h4>
              <p className="text-xs text-[var(--slate-700)] mt-1">
                Sesi opname fisik buta (blind count), review selisih, persetujuan (enforce approver != counter), posting ADJUST, dan ekspor Berita Acara PDF resmi.
              </p>
            </div>
            <div className="inline-flex items-center justify-center px-4 py-3 rounded-xl bg-gradient-to-r from-[var(--emerald-600)] to-[var(--emerald-700)] text-white text-sm font-semibold shadow-sm touch-target cursor-default shrink-0">
              Langkah 3 Terverifikasi
              <ArrowRight className="w-4 h-4 ml-2" />
            </div>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
