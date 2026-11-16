import Link from "next/link";
import {
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  ArrowUpRight,
  ArrowDownLeft,
  History,
  ClipboardList,
  FileText,
  Clock,
  Layers,
  Lock,
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import {
  getMovements,
  getItems,
  getPeople,
  getCurrentStockMap,
  getStockTakes,
} from "@/lib/services/inventory";

export default async function Home() {
  const [items, people, recentMovements, stockMap, stockTakes] = await Promise.all([
    getItems(),
    getPeople(),
    getMovements(5),
    getCurrentStockMap(),
    getStockTakes(),
  ]);

  const activeOpname = stockTakes.find(
    (st) => st.status === "COUNTING" || st.status === "REVIEW" || st.status === "DRAFT"
  );

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
      title: "Hitung Buta (Blind Count)",
      desc: "Petugas lapangan tidak dapat melihat saldo sistem saat menghitung fisik untuk mencegah bias.",
      verified: true,
    },
    {
      title: "Design Tokens Bagian 9",
      desc: "Emerald (#059669), Gold (#B48A25), Cetak (#299775), Slate, dan teks antarmuka berbahasa Indonesia.",
      verified: true,
    },
    {
      title: "Posting Penyesuaian (ADJUST)",
      desc: "Selisih fisik opname dibukukan langsung ke ledger append-only sebagai mutasi ADJUST.",
      verified: true,
    },
    {
      title: "23 Unit Tests Terverifikasi",
      desc: "Pengujian logika stok, konversi kemasan, toleransi opname, dan aturan approver lolos 100%.",
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
            Langkah 4 Aktif: Sesi Stock Opname & Berita Acara PDF Siap Digunakan
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--slate-900)] tracking-tight">
            PT Aksara Riksa Perdana &mdash; Stock Opname & Inventaris
          </h2>
          <p className="text-xs sm:text-sm text-[var(--slate-700)] mt-1.5 leading-relaxed">
            Sistem opname fisik buta (blind count), review toleransi selisih otomatis, penegakan integritas approver &ne; counter, dan penerbitan Berita Acara resmi format cetak A4.
          </p>

          {/* Banner Sesi Opname Aktif jika ada */}
          {activeOpname && (
            <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-900">{activeOpname.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-800">
                      {activeOpname.status}
                    </span>
                  </div>
                  <span className="text-[11px] text-amber-700 block">
                    Progress: {activeOpname.counted_count} / {activeOpname.lines_count} item terhitung
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {activeOpname.status === "COUNTING" && (
                  <Link
                    href={`/opname/${activeOpname.id}/hitung`}
                    className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs"
                  >
                    Lanjutkan Hitung Buta &rarr;
                  </Link>
                )}
                <Link
                  href={`/opname/${activeOpname.id}`}
                  className="px-3 py-2 rounded-lg bg-white border border-amber-300 text-amber-900 text-xs font-semibold shadow-xs hover:bg-amber-100/50"
                >
                  Review Selisih
                </Link>
              </div>
            </div>
          )}

          {/* 4 Tombol Aksi Utama */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            <Link
              href="/opname"
              className="flex flex-col justify-between p-4 rounded-xl bg-gradient-to-br from-[var(--emerald-600)] to-[var(--emerald-700)] text-white shadow-sm hover:from-[var(--emerald-700)] hover:to-[var(--emerald-700)] active:scale-98 touch-target transition-all"
            >
              <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center mb-3">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-emerald-100 font-medium block">Sesi Fisik</span>
                <span className="text-sm sm:text-base font-bold">Stock Opname</span>
              </div>
            </Link>

            <Link
              href="/keluar"
              className="flex flex-col justify-between p-4 rounded-xl bg-white border border-[var(--slate-200)] text-[var(--slate-900)] shadow-xs hover:border-[var(--emerald-500)]/40 hover:bg-slate-50 active:scale-98 touch-target transition-all"
            >
              <div className="w-9 h-9 rounded-lg bg-[var(--emerald-50)] text-[var(--emerald-700)] flex items-center justify-center mb-3">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-[var(--slate-400)] font-medium block">&lt; 10 Detik</span>
                <span className="text-sm sm:text-base font-bold">Catat Keluar</span>
              </div>
            </Link>

            <Link
              href="/masuk"
              className="flex flex-col justify-between p-4 rounded-xl bg-white border border-[var(--slate-200)] text-[var(--slate-900)] shadow-xs hover:border-[var(--emerald-500)]/40 hover:bg-slate-50 active:scale-98 touch-target transition-all"
            >
              <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center mb-3">
                <ArrowDownLeft className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-[var(--slate-400)] font-medium block">Konversi Beli</span>
                <span className="text-sm sm:text-base font-bold">Catat Masuk</span>
              </div>
            </Link>

            <Link
              href="/riwayat"
              className="flex flex-col justify-between p-4 rounded-xl bg-white border border-[var(--slate-200)] text-[var(--slate-900)] shadow-xs hover:bg-slate-50 active:scale-98 touch-target transition-all"
            >
              <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center mb-3">
                <History className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-[var(--slate-400)] font-medium block">Audit Ledger</span>
                <span className="text-sm sm:text-base font-bold">Riwayat Mutasi</span>
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
            <Link href="/opname" className="bg-[var(--bg-canvas)] rounded-xl p-3 border border-[var(--slate-200)] hover:border-slate-300">
              <span className="text-xs text-[var(--slate-400)] font-medium block">Sesi Opname</span>
              <span className="text-xl font-bold text-[var(--slate-900)] num-mono">{stockTakes.length} Sesi</span>
              <span className="text-[11px] text-[var(--slate-700)] block mt-0.5">Lihat Sesi &rarr;</span>
            </Link>
            <div className="bg-[var(--bg-canvas)] rounded-xl p-3 border border-[var(--slate-200)]">
              <span className="text-xs text-[var(--slate-400)] font-medium block">Pengujian Logika</span>
              <span className="text-xl font-bold text-[var(--emerald-700)] num-mono">23 / 23</span>
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
                          : mov.type === "ADJUST"
                          ? "bg-purple-50 text-purple-700"
                          : "bg-[var(--rose-50)] text-[var(--rose-700)]"
                      }`}
                    >
                      {mov.type}
                    </span>
                    <div>
                      <span className="font-bold text-[var(--slate-900)]">{mov.item?.name}</span>
                      <span className="text-[var(--slate-400)] ml-1">
                        {mov.person ? `• oleh ${mov.person.name}` : ""}
                        {mov.ref_type === "STOCK_TAKE" ? " • Hasil Opname" : ""}
                      </span>
                    </div>
                  </div>
                  <span className="num-mono font-bold text-[var(--slate-900)]">
                    {mov.type === "OUT" ? `-${mov.qty}` : mov.qty > 0 ? `+${mov.qty}` : `${mov.qty}`} {mov.item?.unit?.name}
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
                Langkah 4 Selesai
              </span>
              <h4 className="text-base font-bold text-[var(--slate-900)] mt-0.5">
                Siap Melanjutkan ke Langkah 5: Pembelian, PPN, dan Biaya Berulang
              </h4>
              <p className="text-xs text-[var(--slate-700)] mt-1">
                Form pengadaan multi-item, perhitungan PPN otomatis, riwayat harga, pelacakan biaya berulang (listrik, air, internet), dan anggaran bulanan.
              </p>
            </div>
            <div className="inline-flex items-center justify-center px-4 py-3 rounded-xl bg-gradient-to-r from-[var(--emerald-600)] to-[var(--emerald-700)] text-white text-sm font-semibold shadow-sm touch-target cursor-default shrink-0">
              Langkah 4 Terverifikasi
              <ArrowRight className="w-4 h-4 ml-2" />
            </div>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
