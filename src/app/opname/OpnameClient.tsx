"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Plus,
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  Printer,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
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
  const [showHistory, setShowHistory] = useState(false);
  const [sessionName, setSessionName] = useState(() => {
    const label = new Date().toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    return `Stock Opname ${label}`;
  });
  const [starterProfileId, setStarterProfileId] = useState(profiles[0]?.id || "");
  const [scopeCat, setScopeCat] = useState("ALL");
  const [errorMsg, setErrorMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  // 1. Saring sesi uji: hanya yang namanya tidak mengandung kata "simulasi"
  const operationalTakes = stockTakes.filter(
    (st) => !st.name.toLowerCase().includes("simulasi")
  );

  // 2. Pisahkan sesi yang sedang berjalan (DRAFT, COUNTING, REVIEW) vs sesi yang sudah selesai (POSTED, APPROVED)
  const activeSessions = operationalTakes.filter((st) =>
    ["DRAFT", "COUNTING", "REVIEW"].includes(st.status)
  );
  const pastSessions = operationalTakes.filter((st) =>
    ["POSTED", "APPROVED"].includes(st.status)
  );

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
      case "DRAFT":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 text-sky-800 text-xs font-bold border border-sky-200">
            <span className="w-2 h-2 rounded-full bg-sky-600 animate-pulse" />
            Sedang Berjalan
          </span>
        );
      case "REVIEW":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-900 text-xs font-bold border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            Review Selisih
          </span>
        );
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-900 text-xs font-bold border border-indigo-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
            Disetujui Pimpinan
          </span>
        );
      case "POSTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-900 text-xs font-bold border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
            Selesai & Dibukukan
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-semibold">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-5 pb-24 md:pb-12 max-w-2xl mx-auto">
      {/* Header Halaman */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Stock Opname
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Pemeriksaan fisik stok barang di rak dan gudang
          </p>
        </div>

        {activeSessions.length > 0 && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 touch-target transition-colors shadow-2xs"
          >
            <Plus className="w-4 h-4 text-emerald-700" />
            <span className="hidden sm:inline">Sesi Baru</span>
          </button>
        )}
      </div>

      {/* TAMPILAN SESI YANG SEDANG BERJALAN (DRAFT, COUNTING, REVIEW) */}
      {activeSessions.length > 0 ? (
        <div className="space-y-4">
          {activeSessions.map((st) => {
            const counted = st.counted_count || 0;
            const total = st.lines_count || 0;
            const progressRatio = total > 0 ? Math.min(100, Math.round((counted / total) * 100)) : 0;
            const dateStr = new Date(st.cutoff_at).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });

            const isReviewMode = st.status === "REVIEW";

            return (
              <div
                key={st.id}
                className="bg-white rounded-2xl p-5 sm:p-6 border-2 border-slate-200 shadow-xs space-y-5"
              >
                {/* Header Sesi */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-lg font-bold text-slate-900">
                        {st.name}
                      </h2>
                      {getStatusBadge(st.status)}
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      Mulai: {dateStr} &bull; Admin: {st.starter?.full_name || "Admin"}
                    </p>
                  </div>
                </div>

                {/* Progres Fisik Sederhana: "37 dari 128 barang" tanpa persentase ganda */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600">
                      Progres Hitung Fisik
                    </span>
                    <span className="text-sm font-bold text-slate-900 num-mono">
                      {counted} dari {total} barang
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                      style={{ width: `${progressRatio}%` }}
                    />
                  </div>
                </div>

                {/* SATU TOMBOL UTAMA JELAS */}
                <div className="space-y-2 pt-1">
                  {isReviewMode ? (
                    <Link
                      href={`/opname/${st.id}`}
                      className="w-full min-h-[56px] py-3.5 px-5 rounded-2xl bg-white border-2 border-amber-600 text-amber-950 hover:bg-amber-50 active:scale-98 font-bold text-sm shadow-xs touch-target flex items-center justify-center gap-2 transition-all"
                    >
                      <span>Tinjau Hasil Hitung</span>
                      <ArrowRight className="w-4 h-4 text-amber-700" />
                    </Link>
                  ) : (
                    <Link
                      href={`/opname/${st.id}/hitung`}
                      className="w-full min-h-[56px] py-3.5 px-5 rounded-2xl bg-white border-2 border-emerald-600 hover:border-emerald-700 hover:bg-emerald-50/50 active:scale-98 text-slate-900 font-bold text-base shadow-xs touch-target flex items-center justify-center gap-2.5 transition-all"
                    >
                      <ClipboardList className="w-5 h-5 text-emerald-700" />
                      <span className="text-emerald-950">Lanjutkan Hitung</span>
                      <ArrowRight className="w-4 h-4 text-emerald-700" />
                    </Link>
                  )}

                  <div className="flex justify-center">
                    <Link
                      href={`/opname/${st.id}`}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800 py-1.5 px-3 touch-target transition-colors"
                    >
                      Lihat rincian sesi &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* JIKA TIDAK ADA SESI AKTIF: SATU TOMBOL BESAR "MULAI OPNAME BARU" */
        <div className="bg-white rounded-2xl p-8 sm:p-10 border-2 border-slate-200 shadow-xs text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 mx-auto flex items-center justify-center border border-emerald-100">
            <ClipboardList className="w-7 h-7 stroke-[2.3]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Tidak ada sesi opname yang aktif
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-1 max-w-sm mx-auto">
              Mulai sesi baru untuk menghitung stok fisik di rak dan mencocokkan dengan catatan sistem.
            </p>
          </div>
          <div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="min-h-[56px] px-6 py-3.5 rounded-2xl bg-white border-2 border-emerald-600 hover:bg-emerald-50 active:scale-98 text-emerald-950 text-sm font-bold shadow-xs touch-target inline-flex items-center gap-2 transition-all"
            >
              <Plus className="w-5 h-5 text-emerald-700" />
              <span>Mulai Opname Baru</span>
            </button>
          </div>
        </div>
      )}

      {/* SESI POSTED DISEMBUNYIKAN DI BAWAH TAUTAN "RIWAYAT SESI" */}
      {pastSessions.length > 0 && (
        <div className="pt-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between p-3.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs touch-target transition-colors shadow-2xs"
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>Riwayat sesi ({pastSessions.length})</span>
            </div>
            {showHistory ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {showHistory && (
            <div className="mt-2 space-y-2.5 animate-in fade-in duration-150">
              {pastSessions.map((st) => {
                const dateStr = new Date(st.cutoff_at).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                });
                const total = st.lines_count || 0;

                return (
                  <div
                    key={st.id}
                    className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{st.name}</h4>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          Cut-off: {dateStr} &bull; {total} barang
                        </p>
                      </div>
                      {getStatusBadge(st.status)}
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100 flex-wrap">
                      <Link
                        href={`/opname/${st.id}`}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold touch-target transition-colors"
                      >
                        Lihat Rincian
                      </Link>
                      {st.status === "POSTED" && (
                        <Link
                          href={`/opname/${st.id}/berita-acara`}
                          className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-semibold touch-target inline-flex items-center gap-1.5 transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Berita Acara</span>
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL BUKA SESI BARU */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-5 border border-slate-200 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Mulai Sesi Opname Baru
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Buka sesi hitung fisik untuk gudang
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg touch-target"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-900">
                {errorMsg}
              </div>
            )}

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800">
                  Nama Sesi Opname
                </label>
                <input
                  type="text"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  placeholder="Misal: Stock Opname November 2026"
                  className="w-full p-3 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none touch-target"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800">
                  Admin Pembuka Sesi
                </label>
                <select
                  value={starterProfileId}
                  onChange={(e) => setStarterProfileId(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none touch-target"
                >
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} ({p.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800">
                  Cakupan Kategori
                </label>
                <select
                  value={scopeCat}
                  onChange={(e) => setScopeCat(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none touch-target"
                >
                  <option value="ALL">Semua Kategori Barang</option>
                  {categories.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-3 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold text-xs touch-target hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isPending || !sessionName.trim()}
                onClick={handleCreateSession}
                className={cn(
                  "flex-1 py-3 rounded-xl font-bold text-xs text-white shadow-xs touch-target transition-all",
                  isPending || !sessionName.trim()
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-700"
                )}
              >
                {isPending ? "Membuka Sesi..." : "Buka & Mulai Hitung"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
