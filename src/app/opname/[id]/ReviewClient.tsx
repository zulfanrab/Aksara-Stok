"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, AlertTriangle, AlertCircle, Clock, Printer, RotateCcw, ShieldCheck, UserCheck, Lock, ArrowRight, Eye, RefreshCw, X, ShieldAlert, Camera } from "lucide-react";
import type { StockTakeWithDetails, StockTakeLineWithItem, Profile } from "@/lib/services/inventory";
import { calculateStockTakeDiscrepancy } from "@/lib/stock-logic";
import { approveStockTakeAction, postStockTakeAction, submitRecountLineAction } from "@/lib/actions/opname";
import { updateStockTakeLinePhotoAction } from "@/lib/actions/upload";
import { PhotoThumbnail } from "@/components/camera/PhotoThumbnail";
import { PhotoCaptureModal } from "@/components/camera/PhotoCaptureModal";
import { cn } from "@/lib/utils";

interface ReviewClientProps {
  stockTake: StockTakeWithDetails;
  lines: StockTakeLineWithItem[];
  profiles: Profile[];
}

export function ReviewClient({ stockTake, lines: initialLines, profiles }: ReviewClientProps) {
  const [lines, setLines] = useState<StockTakeLineWithItem[]>(initialLines);
  const [activeTab, setActiveTab] = useState<"ALL" | "DIFF" | "RECOUNT">("ALL");
  const [recountingLine, setRecountingLine] = useState<StockTakeLineWithItem | null>(null);
  const [activePhotoLine, setActivePhotoLine] = useState<StockTakeLineWithItem | null>(null);
  const [recountQty, setRecountQty] = useState<number>(0);
  const [recountReason, setRecountReason] = useState<string>("");
  const [selectedApproverId, setSelectedApproverId] = useState<string>(
    profiles.find((p) => p.role === "MANAJER")?.id || profiles[0]?.id || ""
  );
  const [errorMsg, setErrorMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  const handlePhotoUploaded = async (photoPath: string) => {
    if (!activePhotoLine) return;

    const lineId = activePhotoLine.id;
    setLines((prev) =>
      prev.map((l) => (l.id === lineId ? { ...l, photo_path: photoPath } : l))
    );

    await updateStockTakeLinePhotoAction(lineId, photoPath, stockTake.id);
  };

  // Evaluasi selisih untuk setiap baris
  const evaluatedLines = useMemo(() => {
    return lines.map((line) => {
      const isCounted = line.counted_qty !== null;
      const effectiveCount = line.recount_qty !== null ? Number(line.recount_qty) : Number(line.counted_qty || 0);
      const isHighValue = line.item?.kind === "INSTRUMENT";

      const discrepancyInfo = calculateStockTakeDiscrepancy({
        item_id: line.item_id,
        system_qty: Number(line.system_qty),
        counted_qty: Number(line.counted_qty || 0),
        recount_qty: line.recount_qty !== null ? Number(line.recount_qty) : null,
        is_high_value: isHighValue,
      });

      return {
        ...line,
        isCounted,
        effectiveCount,
        discrepancy: discrepancyInfo.discrepancy_qty,
        isWithinTolerance: discrepancyInfo.is_within_tolerance,
        requiresRecount: isCounted && discrepancyInfo.requires_recount && line.recount_qty === null,
        requiresPhoto: discrepancyInfo.requires_photo,
      };
    });
  }, [lines]);

  const totalLines = evaluatedLines.length;
  const countedLines = evaluatedLines.filter((l) => l.isCounted).length;
  const discrepancyLines = evaluatedLines.filter((l) => l.isCounted && l.discrepancy !== 0);
  const recountNeededLines = evaluatedLines.filter((l) => l.requiresRecount);

  const filteredLines = evaluatedLines.filter((line) => {
    if (activeTab === "DIFF") return line.discrepancy !== 0;
    if (activeTab === "RECOUNT") return line.requiresRecount;
    return true;
  });

  // Handle Simpan Recount
  const handleSaveRecount = () => {
    if (!recountingLine) return;
    if (recountQty < 0) {
      setErrorMsg("Kuantitas hitung ulang tidak boleh negatif.");
      return;
    }
    if (!recountReason.trim() || recountReason.trim().length < 3) {
      setErrorMsg("Alasan perbedaan fisik wajib diisi minimal 3 karakter.");
      return;
    }

    setErrorMsg("");
    startTransition(async () => {
      const res = await submitRecountLineAction({
        lineId: recountingLine.id,
        recountQty,
        reason: recountReason.trim(),
      });

      if (res.success) {
        setRecountingLine(null);
        setRecountReason("");
        window.location.reload();
      } else {
        setErrorMsg(res.error || "Gagal menyimpan hitung ulang.");
      }
    });
  };

  // Handle Approve Sesi
  const handleApprove = () => {
    if (!selectedApproverId) {
      setErrorMsg("Pilih pejabat penyetuju.");
      return;
    }

    setErrorMsg("");
    startTransition(async () => {
      const res = await approveStockTakeAction({
        stockTakeId: stockTake.id,
        approvedByProfileId: selectedApproverId,
      });

      if (res.success) {
        window.location.reload();
      } else {
        setErrorMsg(res.error || "Gagal menyetujui sesi.");
      }
    });
  };

  // Handle Posting ADJUST
  const handlePostAdjustments = () => {
    setErrorMsg("");
    startTransition(async () => {
      const res = await postStockTakeAction({
        stockTakeId: stockTake.id,
      });

      if (res.success) {
        window.location.reload();
      } else {
        setErrorMsg(res.error || "Gagal membukukan penyesuaian.");
      }
    });
  };

  return (
    <div className="space-y-4 pb-24 md:pb-12">
      {/* Top Bar Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/opname"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--slate-700)] hover:text-[var(--emerald-700)] touch-target"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Sesi</span>
        </Link>
        <span className="text-xs font-bold text-[var(--slate-400)] num-mono">REVIEW SESI OPNAME</span>
      </div>

      {/* Sesi Status Card */}
      <div className="bg-white rounded-2xl p-5 border border-[var(--slate-200)] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[var(--slate-900)] tracking-tight">{stockTake.name}</h1>
              <span
                className={cn(
                  "px-2.5 py-0.5 rounded-full text-xs font-bold",
                  stockTake.status === "COUNTING" && "bg-sky-50 text-sky-700",
                  stockTake.status === "REVIEW" && "bg-amber-50 text-amber-700",
                  stockTake.status === "APPROVED" && "bg-indigo-50 text-indigo-700",
                  stockTake.status === "POSTED" && "bg-emerald-50 text-emerald-700"
                )}
              >
                {stockTake.status}
              </span>
            </div>
            <p className="text-xs text-[var(--slate-400)] mt-1">
              Cut-off: {new Date(stockTake.cutoff_at).toLocaleString("id-ID")} &bull; Dibuka oleh: {stockTake.starter?.full_name || "Admin"}
              {stockTake.approver && ` • Disetujui oleh: ${stockTake.approver.full_name}`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {stockTake.status === "COUNTING" && (
              <Link
                href={`/opname/${stockTake.id}/hitung`}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--emerald-600)] to-[var(--emerald-700)] text-white text-xs font-semibold shadow-xs touch-target"
              >
                Lanjutkan Hitung Buta &rarr;
              </Link>
            )}

            {stockTake.status === "POSTED" && (
              <Link
                href={`/opname/${stockTake.id}/berita-acara`}
                className="px-4 py-2 rounded-xl bg-[var(--brand-print)] text-white text-xs font-semibold shadow-xs touch-target flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Berita Acara PDF</span>
              </Link>
            )}
          </div>
        </div>

        {/* Quick KPI Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="bg-[var(--bg-canvas)] p-3 rounded-xl border border-[var(--slate-200)]">
            <span className="text-[11px] text-[var(--slate-400)] font-medium block">Total Item Sesi</span>
            <span className="text-xl font-bold text-[var(--slate-900)] num-mono">{totalLines}</span>
            <span className="text-[10px] text-[var(--slate-400)] block">Item Terdaftar</span>
          </div>
          <div className="bg-[var(--bg-canvas)] p-3 rounded-xl border border-[var(--slate-200)]">
            <span className="text-[11px] text-[var(--slate-400)] font-medium block">Selesai Dihitung</span>
            <span className="text-xl font-bold text-[var(--emerald-700)] num-mono">{countedLines}</span>
            <span className="text-[10px] text-[var(--emerald-600)] block">
              {totalLines > 0 ? Math.round((countedLines / totalLines) * 100) : 0}% Lengkap
            </span>
          </div>
          <div className="bg-[var(--bg-canvas)] p-3 rounded-xl border border-[var(--slate-200)]">
            <span className="text-[11px] text-[var(--slate-400)] font-medium block">Item Berselisih</span>
            <span className="text-xl font-bold text-[var(--amber-700)] num-mono">{discrepancyLines.length}</span>
            <span className="text-[10px] text-[var(--amber-600)] block">Fisik &ne; Sistem</span>
          </div>
          <div className="bg-[var(--bg-canvas)] p-3 rounded-xl border border-[var(--slate-200)]">
            <span className="text-[11px] text-[var(--slate-400)] font-medium block">Perlu Hitung Ulang</span>
            <span className="text-xl font-bold text-[var(--rose-700)] num-mono">{recountNeededLines.length}</span>
            <span className="text-[10px] text-[var(--rose-600)] block">Di Luar Toleransi</span>
          </div>
        </div>

        {/* Panel Aksi Persetujuan & Posting */}
        {stockTake.status !== "POSTED" && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-[var(--slate-900)] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[var(--emerald-600)]" />
                  <span>Tahap Otorisasi & Pembukuan Saldo</span>
                </h4>
                <p className="text-[11px] text-[var(--slate-400)] mt-0.5">
                  Aturan Wajib 3: Penyetuju dilarang keras merangkap sebagai petugas penghitung fisik di sesi ini.
                </p>
              </div>

              {stockTake.status === "COUNTING" || stockTake.status === "REVIEW" ? (
                <div className="flex items-center gap-2">
                  <select
                    value={selectedApproverId}
                    onChange={(e) => setSelectedApproverId(e.target.value)}
                    className="py-2 px-3 rounded-xl border border-[var(--slate-200)] bg-white text-xs font-semibold text-[var(--slate-900)] focus:outline-none"
                  >
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name} ({p.role})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleApprove}
                    disabled={isPending || countedLines === 0}
                    className="px-4 py-2 rounded-xl bg-[var(--indigo-700)] hover:bg-[var(--indigo-500)] text-white text-xs font-semibold shadow-xs touch-target transition-colors"
                  >
                    Setujui Sesi (Approve)
                  </button>
                </div>
              ) : stockTake.status === "APPROVED" ? (
                <button
                  onClick={handlePostAdjustments}
                  disabled={isPending}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--emerald-600)] to-[var(--emerald-700)] hover:from-[var(--emerald-700)] hover:to-[var(--emerald-700)] text-white text-xs font-bold shadow-xs touch-target transition-all flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Bukukan Penyesuaian & Selesaikan</span>
                </button>
              ) : null}
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-[var(--rose-50)] border border-[var(--rose-500)]/20 text-xs font-semibold text-[var(--rose-700)] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs Filter Baris */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab("ALL")}
          className={cn(
            "px-3.5 py-1.5 rounded-xl text-xs font-semibold touch-target transition-all",
            activeTab === "ALL"
              ? "bg-[var(--slate-900)] text-white"
              : "bg-white border border-[var(--slate-200)] text-[var(--slate-700)]"
          )}
        >
          Semua Item ({totalLines})
        </button>
        <button
          onClick={() => setActiveTab("DIFF")}
          className={cn(
            "px-3.5 py-1.5 rounded-xl text-xs font-semibold touch-target transition-all",
            activeTab === "DIFF"
              ? "bg-[var(--amber-700)] text-white"
              : "bg-white border border-[var(--slate-200)] text-[var(--slate-700)]"
          )}
        >
          Ada Selisih Fisik ({discrepancyLines.length})
        </button>
        <button
          onClick={() => setActiveTab("RECOUNT")}
          className={cn(
            "px-3.5 py-1.5 rounded-xl text-xs font-semibold touch-target transition-all",
            activeTab === "RECOUNT"
              ? "bg-[var(--rose-700)] text-white"
              : "bg-white border border-[var(--slate-200)] text-[var(--slate-700)]"
          )}
        >
          Perlu Hitung Ulang ({recountNeededLines.length})
        </button>
      </div>

      {/* Tabel Baris Opname (Desktop/Tablet) & Kartu (Mobile) */}
      <div className="bg-white rounded-2xl border border-[var(--slate-200)] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--bg-canvas)] border-b border-[var(--slate-200)] text-xs font-bold text-[var(--slate-700)] uppercase">
              <tr>
                <th className="py-3 px-4">Barang</th>
                <th className="py-3 px-3 text-right">Stok Sistem</th>
                <th className="py-3 px-3 text-right">Hitungan Fisik</th>
                <th className="py-3 px-3 text-right">Selisih</th>
                <th className="py-3 px-3">Penghitung</th>
                <th className="py-3 px-3">Status Toleransi</th>
                <th className="py-3 px-3">Bukti Foto</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--slate-200)] text-xs sm:text-sm">
              {filteredLines.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[var(--slate-400)]">
                    Tidak ada item pada filter ini.
                  </td>
                </tr>
              ) : (
                filteredLines.map((line) => {
                  const isCounted = line.isCounted;
                  const diff = line.discrepancy;
                  const unit = line.item?.unit?.name || "Unit";

                  return (
                    <tr key={line.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="num-mono font-bold text-xs text-[var(--emerald-700)]">
                            {line.item?.code}
                          </span>
                          <span className="font-semibold text-[var(--slate-900)]">
                            {line.item?.name}
                          </span>
                        </div>
                        <span className="text-[11px] text-[var(--slate-400)]">
                          {line.item?.category?.name}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right num-mono font-medium text-[var(--slate-900)]">
                        {line.system_qty} {unit}
                      </td>

                      <td className="py-3 px-3 text-right num-mono font-bold">
                        {isCounted ? (
                          <span className="text-[var(--slate-900)]">
                            {line.effectiveCount} {unit}
                            {line.recount_qty !== null && (
                              <span className="text-[10px] block text-[var(--indigo-700)] font-normal">
                                (Hitung ulang)
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic font-normal">Belum</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right num-mono font-bold">
                        {!isCounted ? (
                          <span className="text-slate-300">-</span>
                        ) : diff === 0 ? (
                          <span className="text-[var(--emerald-700)]">0</span>
                        ) : diff > 0 ? (
                          <span className="text-[var(--emerald-700)]">+{diff} {unit}</span>
                        ) : (
                          <span className="text-[var(--rose-700)]">{diff} {unit}</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-xs text-[var(--slate-700)]">
                        {line.counter?.name || "-"}
                      </td>

                      <td className="py-3 px-3">
                        {!isCounted ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                            <Clock className="w-3 h-3" />
                            Belum Dihitung
                          </span>
                        ) : diff === 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--emerald-700)] bg-[var(--emerald-50)] px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" />
                            Sesuai (0)
                          </span>
                        ) : line.isWithinTolerance ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--emerald-700)] bg-[var(--emerald-50)] px-2 py-0.5 rounded-full">
                            Dalam Toleransi (5%)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--rose-700)] bg-[var(--rose-50)] px-2 py-0.5 rounded-full">
                            <AlertTriangle className="w-3 h-3" />
                            Luar Toleransi
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        {isCounted && diff !== 0 ? (
                          <PhotoThumbnail
                            photoPath={line.photo_path}
                            altText={`Bukti: ${line.item?.name}`}
                            required={line.requiresPhoto}
                            onOpenUpload={() => setActivePhotoLine(line)}
                          />
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {stockTake.status !== "POSTED" && isCounted && diff !== 0 && (
                          <button
                            onClick={() => {
                              setRecountingLine(line);
                              setRecountQty(line.effectiveCount);
                              setRecountReason(line.reason || "");
                            }}
                            className="px-2.5 py-1 rounded-lg border border-[var(--slate-200)] hover:bg-slate-100 text-xs text-[var(--slate-700)] font-semibold touch-target inline-flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Hitung Ulang</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}

            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Hitung Ulang (Recount) */}
      {recountingLine && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-5 border border-[var(--slate-200)] shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div>
                <span className="num-mono font-bold text-xs px-2.5 py-1 rounded bg-[var(--amber-50)] text-[var(--amber-700)]">
                  HITUNG ULANG (RECOUNT)
                </span>
                <h3 className="text-base font-bold text-[var(--slate-900)] mt-2">
                  {recountingLine.item?.name}
                </h3>
              </div>
              <button
                onClick={() => setRecountingLine(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg touch-target"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[var(--bg-canvas)] p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <div>Stok Sistem: <strong className="num-mono">{recountingLine.system_qty} {recountingLine.item?.unit?.name}</strong></div>
              <div>Hitungan Pertama: <strong className="num-mono">{recountingLine.counted_qty} {recountingLine.item?.unit?.name}</strong></div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--slate-700)]">
                  Kuantitas Fisik Hitung Ulang ({recountingLine.item?.unit?.name})
                </label>
                <input
                  type="number"
                  min="0"
                  value={recountQty}
                  onChange={(e) => setRecountQty(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full p-3 rounded-xl border border-[var(--slate-200)] bg-[var(--bg-canvas)] text-lg font-bold text-[var(--slate-900)] num-mono focus:ring-2 focus:ring-[var(--emerald-600)] focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--slate-700)]">
                  Alasan Selisih Fisik (Wajib)
                </label>
                <select
                  onChange={(e) => setRecountReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[var(--slate-200)] bg-[var(--bg-canvas)] text-xs text-[var(--slate-900)] mb-2 focus:outline-none"
                >
                  <option value="">-- Pilih Alasan Umum --</option>
                  <option value="Salah hitung pada penghitungan pertama">Salah hitung pada penghitungan pertama</option>
                  <option value="Barang terselip di rak / lemari lain">Barang terselip di rak / lemari lain</option>
                  <option value="Barang rusak fisik / tidak layak pakai">Barang rusak fisik / tidak layak pakai</option>
                  <option value="Hilang / belum tercatat keluar">Hilang / belum tercatat keluar</option>
                  <option value="Salah konversi satuan kemasan">Salah konversi satuan kemasan</option>
                </select>
                <textarea
                  rows={2}
                  value={recountReason}
                  onChange={(e) => setRecountReason(e.target.value)}
                  placeholder="Keterangan lengkap alasan selisih..."
                  className="w-full p-3 rounded-xl border border-[var(--slate-200)] bg-[var(--bg-canvas)] text-xs text-[var(--slate-900)] focus:ring-2 focus:ring-[var(--emerald-600)] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRecountingLine(null)}
                className="flex-1 py-3 rounded-xl bg-white border border-[var(--slate-200)] text-[var(--slate-700)] font-semibold text-xs touch-target hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isPending || recountReason.trim().length < 3}
                onClick={handleSaveRecount}
                className={cn(
                  "flex-1 py-3 rounded-xl font-semibold text-xs text-white shadow-xs touch-target transition-all",
                  isPending || recountReason.trim().length < 3
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-[var(--emerald-600)] to-[var(--emerald-700)]"
                )}
              >
                {isPending ? "Menyimpan..." : "Simpan Hitung Ulang"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ambil & Unggah Foto Bukti */}
      {activePhotoLine && (
        <PhotoCaptureModal
          isOpen={!!activePhotoLine}
          onClose={() => setActivePhotoLine(null)}
          title={`Foto Bukti: ${activePhotoLine.item?.name}`}
          folder="opname"
          entityId={activePhotoLine.id}
          onUploadSuccess={handlePhotoUploaded}
        />
      )}
    </div>
  );
}

