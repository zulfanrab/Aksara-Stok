"use client";

import { useState } from "react";
import { HelpCircle, X, CheckCircle2, ShieldCheck, Camera, Users, ArrowRight, BookOpen } from "lucide-react";

export function OpnameGuideModal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[var(--slate-200)] text-xs font-semibold text-[var(--slate-700)] hover:bg-slate-50 hover:text-[var(--emerald-700)] shadow-xs touch-target transition-all"
      >
        <BookOpen className="w-3.5 h-3.5 text-[var(--emerald-600)]" />
        <span>Panduan Opname</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl border border-[var(--slate-200)] animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[var(--emerald-50)] text-[var(--emerald-600)] flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[var(--slate-900)]">
                    Panduan Praktis Stock Opname Lapangan
                  </h3>
                  <p className="text-[11px] text-[var(--slate-400)]">
                    PT Aksara Riksa Perdana &bull; Prosedur Resmi 3 Langkah
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 touch-target"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 3 Langkah Panduan */}
            <div className="space-y-3.5 text-xs">
              {/* Langkah 1 */}
              <div className="p-3.5 rounded-xl bg-[var(--bg-canvas)] border border-slate-200 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[var(--emerald-700)] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                    1
                  </span>
                  <h4 className="font-bold text-sm text-[var(--slate-900)]">
                    Hitung Buta (Blind Count) di HP
                  </h4>
                </div>
                <p className="text-slate-600 leading-relaxed pl-7">
                  Saldo sistem sengaja disembunyikan agar penghitungan fisik murni objektif. Petugas fokus pada kartu satu barang:
                </p>
                <ul className="list-disc pl-11 text-[11px] text-slate-500 space-y-0.5">
                  <li>Gunakan tombol sentuh besar <strong>− / +</strong> (&ge; 48 px) atau ketuk angka untuk keypad.</li>
                  <li>Pilih nama petugas penghitung dari daftar karyawan.</li>
                  <li>Tekan <strong>Simpan & Lanjut ke Item Berikutnya</strong> (target &lt; 10 detik/item).</li>
                </ul>
              </div>

              {/* Langkah 2 */}
              <div className="p-3.5 rounded-xl bg-[var(--bg-canvas)] border border-slate-200 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[var(--emerald-700)] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                    2
                  </span>
                  <h4 className="font-bold text-sm text-[var(--slate-900)]">
                    Review Selisih, Hitung Ulang & Foto Bukti
                  </h4>
                </div>
                <p className="text-slate-600 leading-relaxed pl-7">
                  Setelah hitung buta selesai, sistem membandingkan fisik vs sistem:
                </p>
                <ul className="list-disc pl-11 text-[11px] text-slate-500 space-y-0.5">
                  <li><strong>Toleransi 5% / 1 unit</strong> untuk ATK, kebersihan, konsumsi (lolos otomatis).</li>
                  <li><strong>Toleransi 0</strong> untuk alat ukur K3 dan barang di atas Rp 100.000 (wajib hitung ulang oleh orang kedua).</li>
                  <li><strong>Wajib Foto Bukti</strong> jika total nilai selisih &ge; Rp 100.000 (foto otomatis dikompres &le; 200 KB di HP).</li>
                </ul>
              </div>

              {/* Langkah 3 */}
              <div className="p-3.5 rounded-xl bg-[var(--bg-canvas)] border border-slate-200 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[var(--emerald-700)] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                    3
                  </span>
                  <h4 className="font-bold text-sm text-[var(--slate-900)]">
                    Pemisahan Tugas & Posting ADJUST ke Ledger
                  </h4>
                </div>
                <p className="text-slate-600 leading-relaxed pl-7">
                  Integritas laporan ditegakkan secara absolut di level database:
                </p>
                <ul className="list-disc pl-11 text-[11px] text-slate-500 space-y-0.5">
                  <li><strong>Penyetuju &ne; Penghitung:</strong> Penghitung dilarang keras menyetujui hitungannya sendiri. Persetujuan dilakukan oleh Direktur (Habsi Gufira P., S.AP.).</li>
                  <li>Setelah disetujui, klik <strong>Posting ADJUST</strong> untuk menerbitkan mutasi penyesuaian ke ledger append-only.</li>
                  <li>Cetak atau unduh <strong>Berita Acara Opname Resmi PDF</strong> format A4 bertanda tangan 3 pihak.</li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[var(--emerald-600)] to-[var(--emerald-700)] text-white font-semibold text-xs shadow-xs touch-target active:scale-98"
              >
                Saya Mengerti, Tutup Panduan
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
