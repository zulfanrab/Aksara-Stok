"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sparkles, Check, X } from "lucide-react";
import { APP_VERSION, RELEASES } from "@/lib/changelog";

const STORAGE_KEY = "aksara_last_seen_version";

interface UpdateNotificationModalProps {
  // Jika forceOpen=true, dipakai saat pengguna membuka manual lewat menu "Riwayat Pembaruan"
  forceOpen?: boolean;
  onClose?: () => void;
}

export function UpdateNotificationModal({
  forceOpen = false,
  onClose,
}: UpdateNotificationModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const currentRelease = RELEASES.find((r) => r.version === APP_VERSION) || RELEASES[0];

  useEffect(() => {
    // Jika forceOpen diaktifkan (misal dari menu "Riwayat Pembaruan")
    if (forceOpen) {
      setIsOpen(true);
      return;
    }

    // Jangan tampilkan di halaman login atau saat sedang fokus menghitung opname
    if (pathname.includes("/login") || pathname.includes("/hitung")) {
      return;
    }

    try {
      const lastSeen = window.localStorage.getItem(STORAGE_KEY);
      if (lastSeen !== APP_VERSION) {
        setIsOpen(true);
      }
    } catch {
      // Jika localStorage diblokir atau error, jangan tampilkan dan jangan melempar error
      setIsOpen(false);
    }
  }, [forceOpen, pathname]);

  const handleDismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, APP_VERSION);
    } catch {
      // Abaikan jika localStorage tidak bisa diakses
    }
    setIsOpen(false);
    if (onClose) onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-fade-in">
      {/* Container: Bottom Sheet di Mobile (< md) & Dialog Tengah di Desktop (>= md) */}
      <div
        className="w-full md:max-w-md bg-white rounded-t-3xl md:rounded-2xl border border-slate-200 shadow-2xl p-5 md:p-6 space-y-4 max-h-[85vh] overflow-y-auto animate-slide-up md:animate-scale-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="changelog-title"
      >
        {/* Header Modal */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h2
                id="changelog-title"
                className="text-base font-bold text-slate-900 tracking-tight leading-snug"
              >
                Yang baru di Aksara Stok
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-flex items-center px-2 py-0.2 rounded-md bg-emerald-50 text-emerald-700 font-mono text-[11px] font-bold border border-emerald-200">
                  v{currentRelease.version}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  &bull; {currentRelease.date}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center touch-target transition-colors"
            aria-label="Tutup pemberitahuan"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Daftar Poin Pembaruan (Maksimal 5 Poin Ringkas) */}
        <div className="space-y-2.5 pt-1">
          {currentRelease.points.map((point, index) => (
            <div key={index} className="flex items-start gap-2.5 text-xs text-slate-700 leading-relaxed">
              <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-200">
                <Check className="w-3 h-3 stroke-[3]" />
              </div>
              <span className="flex-1 font-medium">{point}</span>
            </div>
          ))}
        </div>

        {/* Satu Tombol Utama: Mengerti */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleDismiss}
            className="w-full min-h-[48px] py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 active:scale-98 text-white font-bold text-sm shadow-xs hover:shadow-sm touch-target transition-all flex items-center justify-center"
          >
            Mengerti
          </button>
        </div>
      </div>
    </div>
  );
}
