"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  FileSpreadsheet,
  Download,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { ReconciliationModal } from "./ReconciliationModal";

export function ParallelRunBanner() {
  const [modalOpen, setModalOpen] = useState(false);

  // Hitung hari transisi (14 hari masa uji coba paralel)
  const totalDays = 14;
  const currentDay = 1;
  const progressPct = Math.round((currentDay / totalDays) * 100);

  return (
    <>
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xs border-2 border-emerald-500/40 relative overflow-hidden">
        {/* Subtle accent bar on the left */}
        <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-[var(--emerald-500)] to-[var(--emerald-700)]" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pl-2">
          <div className="space-y-2.5 max-w-2xl">
            {/* Pill Status */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
              <Calendar className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span>Langkah 9 Aktif: Peluncuran Paralel (Masa Transisi 2 Minggu)</span>
            </div>

            {/* Judul Kontras Tinggi */}
            <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Masa Transisi & Rekonsiliasi: Excel Lama &harr; PWA Aksara Stok
            </h3>

            {/* Deskripsi Teks Hitam-Slate Jelas */}
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
              Aplikasi dan Excel lama berjalan berdampingan selama 2 minggu. Seluruh mutasi dicatat pada PWA &lt; 10 detik, lalu dicocokkan dengan Excel sebelum file lama resmi dikunci sebagai arsip baca-saja (*read-only*).
            </p>

            {/* Status Hari Transisi Kontras Tinggi */}
            <div className="pt-1.5 flex flex-wrap items-center gap-3">
              <div className="w-40 bg-slate-200 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-xs font-bold text-slate-900 num-mono">
                Hari ke-{currentDay} dari {totalDays} Hari Transisi ({progressPct}%)
              </span>
            </div>
          </div>

          {/* Tombol Aksi Cepat dengan Kontras Kuat */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0 pl-2 md:pl-0">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[var(--emerald-600)] to-[var(--emerald-700)] hover:from-[var(--emerald-700)] hover:to-[var(--emerald-700)] text-white text-xs font-bold shadow-xs active:scale-98 touch-target transition-all"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
              <span>Checklist Rekonsiliasi</span>
            </button>

            <Link
              href="/laporan"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold touch-target transition-all shadow-xs"
            >
              <Download className="w-4 h-4 text-slate-700" />
              <span>Ekspor Excel</span>
            </Link>
          </div>
        </div>
      </div>

      <ReconciliationModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
