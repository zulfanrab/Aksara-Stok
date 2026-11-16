"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Plus, ClipboardList, CheckCircle2, Clock, AlertTriangle, ArrowRight, Printer, FileText, User, X } from "lucide-react";
import type { StockTakeWithDetails, Profile, Category } from "@/lib/services/inventory";
import { createStockTakeAction } from "@/lib/actions/opname";
import { cn } from "@/lib/utils";

interface OpnameClientProps {
  stockTakes: StockTakeWithDetails[];
  profiles: Profile[];
  categories: Category[];
}

export function OpnameClient({ stockTakes, profiles, categories }: OpnameClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sessionName, setSessionName] = useState("Stock Opname November 2026");
  const [starterProfileId, setStarterProfileId] = useState(profiles[0]?.id || "");
  const [scopeCat, setScopeCat] = useState("ALL");
  const [errorMsg, setErrorMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleCreateSession = () => {
    if (!sessionName.trim()) {
      setErrorMsg("Nama sesi opname wajib diisi.");
      return;
    }
    if (!starterProfileId) {
      setErrorMsg("Pilih admin pembuka sesi.");
      return;
    }

    setErrorMsg("");
    startTransition(async () => {
      const res = await createStockTakeAction({
        name: sessionName.trim(),
        startedByProfileId: starterProfileId,
        scopeCategoryCode: scopeCat !== "ALL" ? scopeCat : undefined,
      });

      if (res.success) {
        setIsModalOpen(false);
        window.location.href = `/opname/${res.stockTakeId}/hitung`;
      } else {
        setErrorMsg(res.error || "Gagal membuka sesi opname.");
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COUNTING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--sky-50)] text-[var(--sky-700)] text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-[var(--sky-500)] animate-pulse" />
            Hitung Buta Aktif
          </span>
        );
      case "REVIEW":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--amber-50)] text-[var(--amber-700)] text-xs font-semibold">
            <AlertTriangle className="w-3.5 h-3.5 text-[var(--amber-500)]" />
            Review Selisih
          </span>
        );
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--indigo-50)] text-[var(--indigo-700)] text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-[var(--indigo-500)]" />
            Disetujui Pimpinan
          </span>
        );
      case "POSTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--emerald-50)] text-[var(--emerald-700)] text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-[var(--emerald-600)]" />
            Selesai & Dibukukan
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 pb-24 md:pb-12">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-5 border border-[var(--slate-200)] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--slate-900)] tracking-tight">
            Sesi Stock Opname Fisik
          </h1>
          <p className="text-xs text-[var(--slate-400)] mt-0.5">
            Audit fisik buta (blind count), review toleransi, persetujuan pimpinan & Berita Acara PDF
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[var(--emerald-600)] to-[var(--emerald-700)] text-white text-xs sm:text-sm font-semibold shadow-xs hover:from-[var(--emerald-700)] hover:to-[var(--emerald-700)] touch-target transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Buka Sesi Opname Baru</span>
        </button>
      </div>

      {/* List Sesi Opname */}
      <div className="space-y-3">
        {stockTakes.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-[var(--slate-200)]">
            <ClipboardList className="w-12 h-12 text-[var(--slate-400)] mx-auto mb-2" />
            <p className="text-sm font-bold text-[var(--slate-900)]">Belum ada sesi stock opname</p>
            <p className="text-xs text-[var(--slate-400)] mt-1 max-w-sm mx-auto">
              Buka sesi baru untuk memulai proses hitung buta fisik barang di ruang simpan dan gudang.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-4 px-4 py-2.5 rounded-xl bg-[var(--emerald-600)] text-white text-xs font-semibold touch-target inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Buka Sesi Sekarang</span>
            </button>
          </div>
        ) : (
          stockTakes.map((st) => {
            const counted = st.counted_count || 0;
            const total = st.lines_count || 0;
            const progressPct = total > 0 ? Math.round((counted / total) * 100) : 0;
            const dateStr = new Date(st.cutoff_at).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });

            return (
              <div
                key={st.id}
                className="bg-white rounded-2xl p-5 border border-[var(--slate-200)] shadow-xs flex flex-col gap-4 hover:border-slate-300 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-[var(--slate-900)]">{st.name}</h2>
                      {getStatusBadge(st.status)}
                    </div>
                    <p className="text-xs text-[var(--slate-400)] mt-1 flex items-center gap-2">
                      <span>Cut-off: <strong>{dateStr}</strong></span>
                      <span>&bull;</span>
                      <span>Dibuat oleh: <strong>{st.starter?.full_name || "Admin"}</strong></span>
                      {st.approver && (
                        <>
                          <span>&bull;</span>
                          <span className="text-[var(--indigo-700)]">Disetujui: <strong>{st.approver.full_name}</strong></span>
                        </>
                      )}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-[var(--slate-400)] font-medium">Progres Fisik</span>
                    <div className="text-sm font-bold text-[var(--slate-900)] num-mono">
                      {counted} / {total} Item ({progressPct}%)
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[var(--emerald-500)] to-[var(--emerald-600)] transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 flex-wrap gap-2">
                  <div className="text-xs text-[var(--slate-400)]">
                    {st.status === "COUNTING" && "Petugas tidak melihat stok sistem saat menghitung."}
                    {st.status === "REVIEW" && "Tinjau selisih dan lakukan hitung ulang jika perlu."}
                    {st.status === "APPROVED" && "Telah disetujui, siap diposting ke ledger."}
                    {st.status === "POSTED" && "Stok telah disesuaikan dan dibukukan resmi."}
                  </div>

                  <div className="flex items-center gap-2">
                    {st.status === "COUNTING" && (
                      <Link
                        href={`/opname/${st.id}/hitung`}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--emerald-600)] to-[var(--emerald-700)] text-white text-xs font-semibold shadow-xs touch-target flex items-center gap-1.5"
                      >
                        <ClipboardList className="w-3.5 h-3.5" />
                        <span>Mulai Hitung Buta &rarr;</span>
                      </Link>
                    )}

                    <Link
                      href={`/opname/${st.id}`}
                      className="px-3.5 py-2 rounded-xl bg-white border border-[var(--slate-200)] text-[var(--slate-700)] text-xs font-semibold hover:bg-slate-50 touch-target flex items-center gap-1"
                    >
                      <span>Review Detail</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>

                    {st.status === "POSTED" && (
                      <Link
                        href={`/opname/${st.id}/berita-acara`}
                        className="px-3.5 py-2 rounded-xl bg-[var(--brand-print)]/10 text-[var(--brand-print)] hover:bg-[var(--brand-print)]/20 border border-[var(--brand-print)]/30 text-xs font-semibold touch-target flex items-center gap-1.5"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Cetak Berita Acara PDF</span>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Buka Sesi Baru */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-5 border border-[var(--slate-200)] shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div>
                <span className="num-mono font-bold text-xs px-2.5 py-1 rounded bg-[var(--emerald-50)] text-[var(--emerald-700)]">
                  SESI OPNAME BARU
                </span>
                <h3 className="text-lg font-bold text-[var(--slate-900)] mt-2">
                  Buka Sesi Stock Opname
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg touch-target"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-[var(--rose-50)] border border-[var(--rose-500)]/20 text-xs font-semibold text-[var(--rose-700)]">
                {errorMsg}
              </div>
            )}

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--slate-700)]">Nama Sesi Opname</label>
                <input
                  type="text"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  placeholder="Misal: Stock Opname November 2026"
                  className="w-full p-3 rounded-xl border border-[var(--slate-200)] bg-[var(--bg-canvas)] text-xs sm:text-sm text-[var(--slate-900)] focus:ring-2 focus:ring-[var(--emerald-600)] focus:outline-none touch-target"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--slate-700)]">Admin Pembuka Sesi</label>
                <select
                  value={starterProfileId}
                  onChange={(e) => setStarterProfileId(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[var(--slate-200)] bg-[var(--bg-canvas)] text-xs sm:text-sm text-[var(--slate-900)] focus:ring-2 focus:ring-[var(--emerald-600)] focus:outline-none touch-target"
                >
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} ({p.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--slate-700)]">Cakupan Kategori</label>
                <select
                  value={scopeCat}
                  onChange={(e) => setScopeCat(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[var(--slate-200)] bg-[var(--bg-canvas)] text-xs sm:text-sm text-[var(--slate-900)] focus:ring-2 focus:ring-[var(--emerald-600)] focus:outline-none touch-target"
                >
                  <option value="ALL">Semua Kategori Barang (Penuh)</option>
                  {categories.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 rounded-xl bg-[var(--bg-canvas)] border border-slate-200 text-xs text-[var(--slate-400)] leading-relaxed">
                * Saat sesi dibuka, sistem akan otomatis mencatat saldo sistem saat ini sebagai titik cut-off. Petugas akan diarahkan langsung ke antarmuka Hitung Buta.
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-3 rounded-xl bg-white border border-[var(--slate-200)] text-[var(--slate-700)] font-semibold text-xs touch-target hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isPending || !sessionName.trim()}
                onClick={handleCreateSession}
                className={cn(
                  "flex-1 py-3 rounded-xl font-semibold text-xs text-white shadow-xs touch-target transition-all",
                  isPending || !sessionName.trim()
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-[var(--emerald-600)] to-[var(--emerald-700)] hover:from-[var(--emerald-700)] hover:to-[var(--emerald-700)]"
                )}
              >
                {isPending ? "Membuka Sesi..." : "Buka Sesi & Mulai Hitung"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
