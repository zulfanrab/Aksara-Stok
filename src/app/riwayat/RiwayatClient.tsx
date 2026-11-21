"use client";

import { useState, useTransition, useMemo } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  AlertTriangle,
  X,
  CheckCircle2,
  Filter,
  Calendar,
  User,
  Briefcase,
  FileText,
  Search,
  SlidersHorizontal,
} from "lucide-react";
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
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [reversingItem, setReversingItem] = useState<StockMovementWithDetails | null>(null);
  const [reversalReason, setReversalReason] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  // Hitung jumlah transaksi per kategori
  const counts = useMemo(() => {
    return {
      ALL: movements.length,
      IN: movements.filter((m) => m.type === "IN").length,
      OUT: movements.filter((m) => m.type === "OUT").length,
      REVERSAL: movements.filter((m) => m.type === "REVERSAL").length,
      ADJUST: movements.filter((m) => m.type === "ADJUST").length,
    };
  }, [movements]);

  // Filter gabungan jenis transaksi & pencarian
  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      // Filter tipe
      if (selectedFilter !== "ALL" && m.type !== selectedFilter) {
        return false;
      }

      // Filter pencarian
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const itemName = m.item?.name?.toLowerCase() || "";
        const itemCode = m.item?.code?.toLowerCase() || "";
        const personName = m.person?.name?.toLowerCase() || "";
        const projectName = m.project?.name?.toLowerCase() || "";
        const note = m.note?.toLowerCase() || "";
        return (
          itemName.includes(q) ||
          itemCode.includes(q) ||
          personName.includes(q) ||
          projectName.includes(q) ||
          note.includes(q)
        );
      }

      return true;
    });
  }, [movements, selectedFilter, searchQuery]);

  const quickReversalReasons = [
    "Salah input kuantitas",
    "Salah pilih nama barang",
    "Pencatatan ganda (double input)",
    "Barang batal diambil lapangan",
  ];

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
        setReversingItem(null);
        setReversalReason("");
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
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold num-mono border border-emerald-200">
            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-700 stroke-[2.5]" />
            +{qty} {unitName}
          </span>
        );
      case "OUT":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-50 text-sky-800 text-xs font-bold num-mono border border-sky-200">
            <ArrowUpRight className="w-3.5 h-3.5 text-sky-700 stroke-[2.5]" />
            -{qty} {unitName}
          </span>
        );
      case "REVERSAL":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-800 text-xs font-bold num-mono border border-rose-200">
            <RotateCcw className="w-3.5 h-3.5 text-rose-700 stroke-[2.5]" />
            Koreksi ({qty > 0 ? `+${qty}` : qty}) {unitName}
          </span>
        );
      case "ADJUST":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-800 text-xs font-bold num-mono border border-indigo-200">
            Penyesuaian ({qty > 0 ? `+${qty}` : qty}) {unitName}
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 pb-24 md:pb-12">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Riwayat Pergerakan Stok
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Buku besar mutasi barang masuk, keluar, penyesuaian opname, dan koreksi sistem.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Link
              href="/keluar"
              className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white text-xs font-bold shadow-xs touch-target transition-all active:scale-95"
            >
              + Catat Keluar
            </Link>
            <Link
              href="/masuk"
              className="px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold touch-target transition-all active:scale-95 shadow-2xs"
            >
              + Catat Masuk
            </Link>
          </div>
        </div>

        {/* Search Bar Transaksi */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama barang, kode (ATK-001), karyawan, atau catatan..."
            className="w-full pl-10 pr-9 py-2.5 rounded-2xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Pills dengan Jumlah Transaksi Realtime */}
        <div className="flex items-center gap-2 overflow-x-auto pt-1 no-scrollbar -mx-1 px-1">
          {[
            { id: "ALL", label: "Semua", count: counts.ALL },
            { id: "OUT", label: "Barang Keluar", count: counts.OUT },
            { id: "IN", label: "Barang Masuk", count: counts.IN },
            { id: "REVERSAL", label: "Koreksi", count: counts.REVERSAL },
            { id: "ADJUST", label: "Penyesuaian", count: counts.ADJUST },
          ].map((tab) => {
            const isSelected = selectedFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedFilter(tab.id)}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all touch-target shrink-0 flex items-center gap-1.5",
                  isSelected
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                <span>{tab.label}</span>
                <span
                  className={cn(
                    "px-1.5 py-0.2 rounded-full text-[10px] num-mono font-bold",
                    isSelected ? "bg-white/20 text-white" : "bg-white text-slate-700 border border-slate-200"
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Movement List */}
      <div className="space-y-2.5">
        {filteredMovements.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 shadow-xs space-y-2">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-800">Tidak ada transaksi ditemukan</p>
            <p className="text-xs text-slate-400">
              {searchQuery
                ? `Tidak ada transaksi yang cocok dengan kata kunci "${searchQuery}".`
                : "Belum ada transaksi dalam kategori ini."}
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
                className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 transition-colors"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getMovementBadge(mov.type, mov.qty, mov.item?.unit?.name)}
                    <span className="num-mono font-bold text-xs text-emerald-800 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200">
                      {mov.item?.code}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                      {mov.item?.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                    <span className="flex items-center gap-1 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{dateStr}</span>
                    </span>
                    {mov.person && (
                      <span className="flex items-center gap-1 text-slate-800 font-semibold">
                        <User className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{mov.person.name}</span>
                      </span>
                    )}
                    {mov.project && (
                      <span className="flex items-center gap-1 text-slate-600">
                        <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                        <span>{mov.project.name}</span>
                      </span>
                    )}
                  </div>

                  {mov.note && (
                    <div className="text-xs text-slate-700 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 italic">
                      &ldquo;{mov.note}&rdquo;
                    </div>
                  )}
                </div>

                {/* Tombol Koreksi Transaksi */}
                {mov.type !== "REVERSAL" && (
                  <button
                    type="button"
                    onClick={() => setReversingItem(mov)}
                    className="self-end sm:self-center px-3 py-2 rounded-xl bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200 text-xs font-bold touch-target transition-colors flex items-center gap-1.5 shrink-0"
                    title="Terbitkan transaksi pembalik (koreksi)"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-rose-700" />
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
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-800 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                  <RotateCcw className="w-3.5 h-3.5" />
                  Koreksi Transaksi
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-2">
                  Koreksi Transaksi {reversingItem.type === "IN" ? "Barang Masuk" : reversingItem.type === "OUT" ? "Barang Keluar" : "Penyesuaian"}?
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReversingItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl touch-target"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="font-bold text-slate-900">{reversingItem.item?.name}</div>
              <div className="text-slate-700">
                Jumlah Asli:{" "}
                <strong className="num-mono font-bold text-slate-900">
                  {reversingItem.qty} {reversingItem.item?.unit?.name}
                </strong>
              </div>
              <div className="text-[11px] text-slate-500 leading-relaxed pt-1.5 border-t border-slate-200">
                Sesuai standar integritas pembukuan (Append-Only), transaksi lama tidak akan dihapus.
                Sistem akan membuat transaksi pembalik otomatis bertipe{" "}
                <strong className="text-rose-700">REVERSAL</strong> dengan jumlah{" "}
                <strong className="num-mono">
                  {reversingItem.type === "IN" ? `-${reversingItem.qty}` : `+${reversingItem.qty}`} {reversingItem.item?.unit?.name}
                </strong>{" "}
                untuk mengembalikan saldo sistem ke posisi semula.
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800">
                Alasan Koreksi / Pembatalan <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={2}
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                placeholder="Misal: Salah input kuantitas barang..."
                className="w-full p-3 rounded-2xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />

              {/* Quick Reason Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {quickReversalReasons.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setReversalReason(reason)}
                    className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-800 text-[11px] font-semibold text-slate-600 border border-slate-200 transition-colors touch-target whitespace-nowrap"
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReversingItem(null)}
                className="flex-1 min-h-[48px] py-2.5 rounded-2xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 touch-target"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isPending || !reversalReason.trim()}
                onClick={handleReversalSubmit}
                className={cn(
                  "flex-1 min-h-[48px] py-2.5 rounded-2xl text-xs font-bold text-white shadow-xs touch-target transition-all",
                  isPending || !reversalReason.trim()
                    ? "bg-slate-300 cursor-not-allowed"
                    : "bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 active:scale-98"
                )}
              >
                {isPending ? "Memproses..." : "Konfirmasi Koreksi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
