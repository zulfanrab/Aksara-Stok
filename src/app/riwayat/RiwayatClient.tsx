"use client";

import { useState, useTransition } from "react";
import { ArrowDownLeft, ArrowUpRight, RotateCcw, AlertTriangle, X, CheckCircle2, Filter, Calendar, User, Briefcase, FileText } from "lucide-react";
import Link from "next/link";
import type { StockMovementWithDetails } from "@/lib/services/inventory";
import { recordStockReversalAction } from "@/lib/actions/stock";
import { cn } from "@/lib/utils";

interface RiwayatClientProps {
  initialMovements: StockMovementWithDetails[];
}

export function RiwayatClient({ initialMovements }: RiwayatClientProps) {
  const [movements, setMovements] = useState(initialMovements);
  const [selectedFilter, setSelectedFilter] = useState<string>("ALL");
  const [reversingItem, setReversingItem] = useState<StockMovementWithDetails | null>(null);
  const [reversalReason, setReversalReason] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  const filteredMovements = movements.filter((m) => {
    if (selectedFilter === "ALL") return true;
    return m.type === selectedFilter;
  });

  const handleReversalSubmit = () => {
    if (!reversingItem) return;
    if (!reversalReason.trim() || reversalReason.trim().length < 3) {
      setErrorMsg("Alasan koreksi/pembatalan wajib diisi minimal 3 karakter.");
      return;
    }

    setErrorMsg("");
    const clientUuid = crypto.randomUUID();

    startTransition(async () => {
      const res = await recordStockReversalAction({
        clientUuid,
        originalMovementId: reversingItem.id,
        reason: reversalReason.trim(),
      });

      if (res.success) {
        // Optimistic UI update or refresh
        setReversingItem(null);
        setReversalReason("");
        // Reload page to fetch updated ledger
        window.location.reload();
      } else {
        setErrorMsg(res.error || "Gagal membuat transaksi pembalik.");
      }
    });
  };

  const getMovementBadge = (type: string, qty: number, unitName?: string) => {
    switch (type) {
      case "IN":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--emerald-50)] text-[var(--emerald-700)] text-xs font-bold num-mono">
            <ArrowDownLeft className="w-3.5 h-3.5 text-[var(--emerald-600)]" />
            +{qty} {unitName}
          </span>
        );
      case "OUT":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--sky-50)] text-[var(--sky-700)] text-xs font-bold num-mono">
            <ArrowUpRight className="w-3.5 h-3.5 text-[var(--sky-700)]" />
            -{qty} {unitName}
          </span>
        );
      case "REVERSAL":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--rose-50)] text-[var(--rose-700)] text-xs font-bold num-mono">
            <RotateCcw className="w-3.5 h-3.5 text-[var(--rose-700)]" />
            Pembalik ({qty > 0 ? `+${qty}` : qty}) {unitName}
          </span>
        );
      case "ADJUST":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--indigo-50)] text-[var(--indigo-700)] text-xs font-bold num-mono">
            Penyesuaian ({qty > 0 ? `+${qty}` : qty}) {unitName}
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 pb-24 md:pb-12">
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[var(--slate-200)] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--slate-900)] tracking-tight">
              Riwayat Pergerakan Stok (Ledger)
            </h1>
            <p className="text-xs text-[var(--slate-400)] mt-0.5">
              Jurnal mutasi append-only &bull; Setiap transaksi memiliki UUID idempoten
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/keluar"
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[var(--emerald-600)] to-[var(--emerald-700)] text-white text-xs font-semibold shadow-xs touch-target"
            >
              + Catat Keluar
            </Link>
            <Link
              href="/masuk"
              className="px-3.5 py-2 rounded-xl bg-white border border-[var(--slate-200)] text-[var(--slate-700)] text-xs font-semibold hover:bg-slate-50 touch-target"
            >
              + Catat Masuk
            </Link>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pt-4 no-scrollbar">
          {["ALL", "IN", "OUT", "REVERSAL"].map((filter) => {
            const isSelected = selectedFilter === filter;
            const labels: Record<string, string> = {
              ALL: "Semua Mutasi",
              IN: "Penerimaan (IN)",
              OUT: "Pengeluaran (OUT)",
              REVERSAL: "Pembalik (REVERSAL)",
            };
            return (
              <button
                key={filter}
                onClick={() => setSelectedFilter(filter)}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all touch-target shrink-0",
                  isSelected
                    ? "bg-[var(--slate-900)] text-white shadow-xs"
                    : "bg-[var(--bg-canvas)] border border-[var(--slate-200)] text-[var(--slate-700)] hover:bg-slate-100"
                )}
              >
                {labels[filter]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Movement List */}
      <div className="space-y-2.5">
        {filteredMovements.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-[var(--slate-200)]">
            <FileText className="w-10 h-10 text-[var(--slate-400)] mx-auto mb-2" />
            <p className="text-sm font-semibold text-[var(--slate-900)]">Belum ada transaksi</p>
            <p className="text-xs text-[var(--slate-400)] mt-1">
              Catat barang keluar atau masuk untuk memulai mutasi stok.
            </p>
          </div>
        ) : (
          filteredMovements.map((mov) => {
            const dateStr = new Date(mov.occurred_at).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={mov.id}
                className="bg-white rounded-2xl p-4 border border-[var(--slate-200)] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 transition-colors"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getMovementBadge(mov.type, mov.qty, mov.item?.unit?.name)}
                    <span className="num-mono font-bold text-xs text-[var(--emerald-700)]">
                      {mov.item?.code}
                    </span>
                    <span className="text-xs font-bold text-[var(--slate-900)]">
                      {mov.item?.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-[var(--slate-400)] flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{dateStr}</span>
                    </span>
                    {mov.person && (
                      <span className="flex items-center gap-1 text-[var(--slate-700)] font-medium">
                        <User className="w-3.5 h-3.5 text-[var(--emerald-600)]" />
                        <span>{mov.person.name}</span>
                      </span>
                    )}
                    {mov.project && (
                      <span className="flex items-center gap-1 text-[var(--slate-700)]">
                        <Briefcase className="w-3.5 h-3.5 text-[var(--slate-400)]" />
                        <span>{mov.project.name}</span>
                      </span>
                    )}
                  </div>

                  {mov.note && (
                    <div className="text-xs text-[var(--slate-700)] bg-[var(--bg-canvas)] px-2.5 py-1 rounded-lg border border-slate-100 italic">
                      &ldquo;{mov.note}&rdquo;
                    </div>
                  )}
                </div>

                {/* Tombol Koreksi Transaksi */}
                {mov.type !== "REVERSAL" && (
                  <button
                    onClick={() => setReversingItem(mov)}
                    className="self-end sm:self-center px-3 py-1.5 rounded-xl bg-[var(--rose-50)] text-[var(--rose-700)] hover:bg-[var(--rose-500)] hover:text-white border border-[var(--rose-500)]/20 text-xs font-semibold touch-target transition-colors flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Koreksi</span>
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal Koreksi / Pembalik Transaksi */}
      {reversingItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-5 border border-[var(--slate-200)] shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-[var(--rose-700)] bg-[var(--rose-50)] px-2.5 py-1 rounded-full border border-[var(--rose-500)]/20">
                  <RotateCcw className="w-3.5 h-3.5" />
                  Koreksi Transaksi (REVERSAL)
                </span>
                <h3 className="text-base font-bold text-[var(--slate-900)] mt-2">
                  Batalkan Transaksi {reversingItem.type} #{reversingItem.id.substring(0, 8)}?
                </h3>
              </div>
              <button
                onClick={() => setReversingItem(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg touch-target"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--slate-200)] text-xs space-y-1.5">
              <div className="font-bold text-[var(--slate-900)]">{reversingItem.item?.name}</div>
              <div className="text-[var(--slate-700)]">
                Jumlah Asli: <strong className="num-mono font-bold">{reversingItem.qty} {reversingItem.item?.unit?.name}</strong>
              </div>
              <div className="text-[11px] text-[var(--slate-400)] leading-relaxed pt-1 border-t border-slate-200">
                Sesuai aturan ledger append-only, data transaksi asli tidak akan dihapus. Sistem akan membuat transaksi pembalik bertipe <strong>REVERSAL</strong> untuk menetralkan saldo stok.
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-[var(--rose-50)] border border-[var(--rose-500)]/20 text-xs font-semibold text-[var(--rose-700)] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold text-[var(--slate-700)]">
                Alasan Koreksi / Pembatalan (Wajib)
              </label>
              <textarea
                rows={2}
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                placeholder="Contoh: Salah ketik jumlah, seharusnya 2 bukan 5..."
                className="w-full p-3 rounded-xl border border-[var(--slate-200)] bg-[var(--bg-canvas)] text-xs sm:text-sm text-[var(--slate-900)] focus:ring-2 focus:ring-[var(--rose-500)] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReversingItem(null)}
                className="flex-1 py-3 rounded-xl bg-white border border-[var(--slate-200)] text-[var(--slate-700)] font-semibold text-xs touch-target hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isPending || reversalReason.trim().length < 3}
                onClick={handleReversalSubmit}
                className={cn(
                  "flex-1 py-3 rounded-xl font-semibold text-xs text-white shadow-xs touch-target transition-all",
                  isPending || reversalReason.trim().length < 3
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-[var(--rose-500)] to-[var(--rose-700)] hover:from-[var(--rose-700)] hover:to-[var(--rose-700)]"
                )}
              >
                {isPending ? "Menyimpan Pembalik..." : "Konfirmasi Koreksi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
