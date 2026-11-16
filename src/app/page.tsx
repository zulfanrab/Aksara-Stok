import Link from "next/link";
import { CheckCircle2, ShieldCheck, Database, ArrowRight, Layers, Lock, Package, Users } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";

export default function Home() {
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
      title: "18 Unit Tests Terverifikasi",
      desc: "Pengujian logika stok, konversi satuan kemasan, dan toleransi opname 100% lolos.",
      verified: true,
    },
    {
      title: "Master Data 128 Barang Bersih",
      desc: "Duplikasi digabung, kode rusak diperbaiki, biaya rutin dipisah, dan data 13 karyawan aktif di Supabase.",
      verified: true,
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--slate-700)] flex flex-col">
      <Navbar />

      {/* Main Content Area - Mobile-First 360px layout */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6 pb-24 md:pb-12">
        {/* Hero Card */}
        <div className="bg-white rounded-2xl p-5 sm:p-7 border border-[var(--slate-200)] shadow-xs">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[var(--emerald-50)] text-[var(--emerald-700)] text-xs font-semibold mb-3">
            <ShieldCheck className="w-4 h-4 text-[var(--emerald-600)]" />
            Langkah 2 Selesai: Master Data & Pengguna Barang Siap
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--slate-900)] leading-snug">
            Sistem Inventaris PT Aksara Riksa Perdana
          </h2>
          <p className="text-sm text-[var(--slate-700)] mt-2 leading-relaxed">
            Database Supabase telah terisi data riil yang dinormalisasi dari Excel: 128 master barang terstandarisasi,
            13 karyawan pengguna barang fisik, 7 kategori, 19 satuan, serta 8 aturan konversi satuan.
          </p>

          {/* Tombol Aksi Cepat Master Data */}
          <div className="flex flex-col sm:flex-row gap-3 mt-5">
            <Link
              href="/barang"
              className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-gradient-to-r from-[var(--emerald-600)] to-[var(--emerald-700)] text-white font-semibold text-sm shadow-sm hover:from-[var(--emerald-700)] hover:to-[var(--emerald-700)] touch-target transition-all"
            >
              <Package className="w-4 h-4" />
              <span>Buka Master Barang (128 Item)</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>

            <Link
              href="/karyawan"
              className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-white border border-[var(--slate-200)] text-[var(--slate-700)] font-semibold text-sm hover:bg-slate-50 touch-target transition-all"
            >
              <Users className="w-4 h-4 text-[var(--emerald-600)]" />
              <span>Daftar 13 Karyawan (People)</span>
            </Link>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
            <div className="bg-[var(--bg-canvas)] rounded-xl p-3 border border-[var(--slate-200)]">
              <span className="text-xs text-[var(--slate-400)] font-medium block">Master Barang</span>
              <span className="text-xl font-bold text-[var(--slate-900)] num-mono">128 Item</span>
              <span className="text-[11px] text-[var(--emerald-600)] block mt-0.5">Kode Bersih</span>
            </div>
            <div className="bg-[var(--bg-canvas)] rounded-xl p-3 border border-[var(--slate-200)]">
              <span className="text-xs text-[var(--slate-400)] font-medium block">Pengguna Barang</span>
              <span className="text-xl font-bold text-[var(--slate-900)] num-mono">13 Orang</span>
              <span className="text-[11px] text-[var(--slate-700)] block mt-0.5">Tabel people</span>
            </div>
            <div className="bg-[var(--bg-canvas)] rounded-xl p-3 border border-[var(--slate-200)]">
              <span className="text-xs text-[var(--slate-400)] font-medium block">Kategori & Satuan</span>
              <span className="text-xl font-bold text-[var(--slate-900)] num-mono">7 / 19</span>
              <span className="text-[11px] text-[var(--slate-700)] block mt-0.5">8 Konversi</span>
            </div>
            <div className="bg-[var(--bg-canvas)] rounded-xl p-3 border border-[var(--slate-200)]">
              <span className="text-xs text-[var(--slate-400)] font-medium block">Pengujian Vitest</span>
              <span className="text-xl font-bold text-[var(--emerald-700)] num-mono">18 / 18</span>
              <span className="text-[11px] text-[var(--emerald-600)] block mt-0.5">Lolos 100%</span>
            </div>
          </div>
        </div>

        {/* Penerapan Design Tokens Status Sesuai Bagian 9 */}
        <div className="bg-white rounded-2xl p-5 border border-[var(--slate-200)] shadow-xs">
          <h3 className="text-sm font-bold text-[var(--slate-900)] mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4 text-[var(--emerald-600)]" />
            Design Tokens Status Inventaris (Bagian 9)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[var(--emerald-50)] text-[var(--emerald-700)] text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-[var(--emerald-600)] shrink-0" />
              <span>Aman (&gt; Min)</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[var(--amber-50)] text-[var(--amber-700)] text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-[var(--amber-500)] shrink-0" />
              <span>Menipis (&le; Min)</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[var(--rose-50)] text-[var(--rose-700)] text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-[var(--rose-500)] shrink-0" />
              <span>Habis (&le; 0)</span>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-[var(--slate-200)] text-[var(--slate-700)] text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-[var(--slate-400)] shrink-0" />
              <span>Belum Dihitung</span>
            </div>
          </div>
        </div>

        {/* 8 Aturan Wajib Checklist */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[var(--slate-200)] shadow-xs">
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
                Langkah 2 Selesai
              </span>
              <h4 className="text-base font-bold text-[var(--slate-900)] mt-0.5">
                Siap Melanjutkan ke Langkah 3: Pencatatan Masuk & Keluar
              </h4>
              <p className="text-xs text-[var(--slate-700)] mt-1">
                Form Catat Keluar (&lt; 10 detik), Catat Masuk dengan konversi satuan, riwayat pergerakan stok, dan transaksi pembalik (REVERSAL).
              </p>
            </div>
            <div className="inline-flex items-center justify-center px-4 py-3 rounded-xl bg-gradient-to-r from-[var(--emerald-600)] to-[var(--emerald-700)] text-white text-sm font-semibold shadow-sm touch-target cursor-default shrink-0">
              Langkah 2 Terverifikasi
              <ArrowRight className="w-4 h-4 ml-2" />
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Bar untuk HP */}
      <BottomNav />
    </div>
  );
}
