"use client";

import { WifiOff, RefreshCw, CheckCircle2, AlertTriangle, Trash2 } from "lucide-react";
import { useOfflineSync } from "@/lib/offline/useOfflineSync";

export function OfflineStatusBanner() {
  const { isOnline, pendingCount, failedItems, isSyncing, triggerSync, dismissOutboxItem } =
    useOfflineSync();

  // Jika online dan tidak ada antrean, tidak perlu menampilkan banner peringatan
  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <div className="w-full bg-slate-900 text-white text-xs px-4 py-2.5 transition-all shadow-sm space-y-2">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {!isOnline ? (
            <div className="inline-flex items-center gap-1.5 text-amber-400 font-semibold">
              <WifiOff className="w-4 h-4 shrink-0 text-amber-400" />
              <span>Mode Offline Lapangan</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Terhubung Kembali</span>
            </div>
          )}

          <span className="text-slate-300 text-[11px]">
            {!isOnline
              ? "Koneksi terputus. Data transaksi dicatat aman di memori HP Anda."
              : failedItems.length > 0
              ? `${pendingCount} antrean (${failedItems.length} perlu perhatian).`
              : `Koneksi pulih. Ada ${pendingCount} mutasi di antrean perangkat.`}
          </span>
        </div>

        {pendingCount > 0 && (
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[11px] num-mono">
              {pendingCount} Antrean
            </span>
            {isOnline && (
              <button
                onClick={() => triggerSync()}
                disabled={isSyncing}
                className="px-3 py-1.5 rounded-lg bg-[var(--emerald-600)] hover:bg-[var(--emerald-700)] text-white font-semibold text-xs inline-flex items-center gap-1.5 active:scale-95 disabled:opacity-50 touch-target"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                <span>{isSyncing ? "Menyinkronkan..." : "Sinkronkan Sekarang"}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {failedItems.length > 0 && (
        <div className="max-w-5xl mx-auto space-y-1.5 pt-1 border-t border-slate-800">
          {failedItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-2 bg-rose-950/60 border border-rose-700/50 rounded-lg px-2.5 py-1.5 text-[11px]"
            >
              <div className="flex items-center gap-1.5 min-w-0 text-rose-200">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span className="font-bold shrink-0">{item.actionType}:</span>
                <span className="truncate">{item.errorMessage || "Gagal disinkronkan."}</span>
              </div>
              <button
                type="button"
                onClick={() => dismissOutboxItem(item.id)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-rose-800/80 hover:bg-rose-700 text-white font-semibold shrink-0"
                title="Hapus antrean gagal"
              >
                <Trash2 className="w-3 h-3" />
                <span>Hapus</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
