"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FileSpreadsheet,
  CheckCircle2,
  X,
  FileCheck,
  ShieldCheck,
  Download,
  AlertTriangle,
  Lock,
  Calendar,
  Check,
} from "lucide-react";

interface ReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ReconciliationModal({ isOpen, onClose }: ReconciliationModalProps) {
  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({
    1: true,
    2: true,
    3: false,
    4: false,
    5: false,
  });

  const toggleCheck = (idx: number) => {
    setCheckedSteps((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  if (!isOpen) return null;

  const allCompleted = Object.values(checkedSteps).filter(Boolean).length === 5;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full p-5 sm:p-6 space-y-4 shadow-2xl border border-[var(--slate-200)] animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[var(--emerald-600)] flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Checklist Rekonsiliasi Paralel Excel vs PWA
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Prosedur Harian Transisi 2 Minggu &bull; Marsya & Ajay
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 touch-target"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Banner */}
        <div className="p-3.5 rounded-xl bg-[var(--bg-canvas)] border border-slate-200 text-xs text-[var(--slate-700)] leading-relaxed space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-[var(--emerald-800)]">
            <Calendar className="w-4 h-4 text-[var(--emerald-600)]" />
            <span>Masa Transisi Paralel: 14 Hari Kalender (2 Pekan)</span>
          </div>
          <p className="text-[11px]">
            Selama 2 minggu ke depan, setiap mutasi dicatat pada PWA Aksara Stok terlebih dahulu, kemudian dicatat pada file Excel lama. Di akhir masa transisi, Excel lama akan dikunci menjadi arsip baca-saja (*read-only*).
          </p>
        </div>

        {/* 5 Langkah Rekonsiliasi */}
        <div className="space-y-2.5">
          {[
            {
              id: 1,
              title: "1. Pencatatan Mutasi di PWA Aksara Stok (< 10 Detik)",
              desc: "Catat setiap barang keluar (pemakaian teknisi/ahli K3) di /keluar atau barang masuk pembelian di /masuk.",
            },
            {
              id: 2,
              title: "2. Pencatatan Paralel di File Excel Lama",
              desc: "Input data yang sama ke buku/file Excel inventaris lama PT Aksara Riksa Perdana sebagai salinan kontrol paralel.",
            },
            {
              id: 3,
              title: "3. Unduh Rekap Stok Excel dari Halaman Laporan",
              desc: "Buka menu /laporan lalu klik 'Ekspor Excel (.xlsx)' untuk mengunduh rekapitulasi saldo sistem otomatis.",
            },
            {
              id: 4,
              title: "4. Bandingkan Saldo Akhir (Target Selisih = 0)",
              desc: "Pastikan seluruh angka fisik dan saldo akhir di file Excel lama sama persis dengan rekap hasil ekspor PWA.",
            },
            {
              id: 5,
              title: "5. Berita Acara & Kunci Excel Menjadi Arsip Baca-Saja",
              desc: "Setelah 14 hari tanpa selisih, simpan file Excel dengan nama '[ARSIP] Inventaris s.d. Nov 2026.xlsx' dan kunci password proteksi.",
            },
          ].map((step) => (
            <div
              key={step.id}
              onClick={() => toggleCheck(step.id)}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                checkedSteps[step.id]
                  ? "bg-emerald-50/50 border-emerald-300 text-emerald-950"
                  : "bg-white border-slate-200 hover:border-slate-300"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${
                  checkedSteps[step.id]
                    ? "bg-[var(--emerald-600)] border-[var(--emerald-600)] text-white"
                    : "border-slate-300 bg-white"
                }`}
              >
                {checkedSteps[step.id] && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
              <div className="flex-1 text-xs">
                <span className="font-bold block text-[var(--slate-900)]">{step.title}</span>
                <span className="text-[11px] text-[var(--slate-700)] mt-0.5 block leading-relaxed">
                  {step.desc}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Berita Acara Draft Notice */}
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <Lock className="w-3.5 h-3.5 text-amber-700" />
            <span>Target Akhir Langkah 9 (Cut-Off Final):</span>
          </div>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            Setelah 2 minggu verifikasi paralel, Marsya dan Ajay akan menandatangani <strong>Berita Acara Alih Sistem Resmi</strong> bersama Direktur (Habsi Gufira P., S.AP.), dan sistem Excel lama resmi dihentikan pembaruannya.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <Link
            href="/laporan"
            onClick={onClose}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-[var(--slate-200)] text-xs font-semibold text-[var(--slate-700)] hover:bg-slate-50 touch-target shadow-xs"
          >
            <Download className="w-4 h-4 text-[var(--emerald-600)]" />
            <span>Buka Laporan & Ekspor Excel</span>
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-[var(--emerald-600)] to-[var(--emerald-700)] text-white text-xs font-semibold shadow-xs touch-target hover:from-[var(--emerald-700)] hover:to-[var(--emerald-700)]"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Tutup & Lanjutkan Transisi</span>
          </button>
        </div>
      </div>
    </div>
  );
}
