"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  FileSpreadsheet,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Download,
  ClipboardList,
} from "lucide-react";
import { ReconciliationModal } from "./ReconciliationModal";

export function ParallelRunBanner() {
  const [modalOpen, setModalOpen] = useState(false);

  // Hitung hari transisi (misal: 14 hari masa uji coba paralel)
  const totalDays = 14;
  const currentDay = 1;
  const progressPct = Math.round((currentDay / totalDays) * 100);

  return (
    <>
      <div className="bg-gradient-to-br from-emerald-900 via-[var(--emerald-800)] to-teal-900 rounded-2xl p-5 sm:p-6 text-white shadow-md border border-emerald-700/50 relative overflow-hidden">
        {/* Background glow decoration */}
        <div className="absolute -right-10 -bottom-10 w-44 h-44 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-semibold backdrop-blur-xs">
              <Calendar className="w-3.5 h-3.5 text-emerald-300" />
              <span>Langkah 9 Aktif: Peluncuran Paralel (2 Minggu)</span>
            </div>

            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Masa Transisi & Rekonsiliasi: Excel Lama &harr; PWA Aksara Stok
            </h3>

            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed max-w-2xl">
              Aplikasi dan Excel lama berjalan berdampingan selama 2 minggu. Seluruh mutasi dicatat pada PWA &lt; 10 detik, lalu dicocokkan dengan Excel sebelum file lama resmi dikunci sebagai arsip baca-saja (*read-only*).
            </p>

            {/* Status Hari Transisi */}
            <div className="pt-1 flex items-center gap-3">
              <div className="w-36 bg-white/20 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-[11px] font-bold text-emerald-200 num-mono">
                Hari ke-{currentDay} dari {totalDays} Hari Transisi ({progressPct}%)
              </span>
            </div>
          </div>

          {/* Tombol Aksi Cepat */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-emerald-950 text-xs font-bold shadow-sm hover:bg-emerald-50 active:scale-98 touch-target transition-all"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>Checklist Rekonsiliasi</span>
            </button>

            <Link
              href="/laporan"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold touch-target transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Ekspor Excel</span>
            </Link>
          </div>
        </div>
      </div>

      <ReconciliationModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
