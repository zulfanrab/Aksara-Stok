"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Plus, Minus, User, EyeOff, CheckCircle2, ListFilter, X, ShieldAlert, WifiOff } from "lucide-react";
import type { StockTakeWithDetails, StockTakeLineWithItem } from "@/lib/services/inventory";
import type { Person } from "@/types/inventory";
import { submitCountLineAction } from "@/lib/actions/opname";
import { enqueueOutboxItem, setCachedMasterData, getCachedMasterData } from "@/lib/offline/db";
import { notifyOutboxChanged } from "@/lib/offline/sync";
import { OpnameGuideModal } from "@/components/opname/OpnameGuideModal";
import { cn } from "@/lib/utils";

interface HitungClientProps {
  stockTake: StockTakeWithDetails;
  lines: StockTakeLineWithItem[];
  people: Person[];
}

export function HitungClient({ stockTake, lines, people }: HitungClientProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [counterPersonId, setCounterPersonId] = useState(people[0]?.id || "");
  const [isPending, startTransition] = useTransition();
  const [localLines, setLocalLines] = useState(lines);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const currentLine = localLines[currentIndex];
  const [countedQty, setCountedQty] = useState<number>(
    currentLine?.counted_qty !== null && currentLine?.counted_qty !== undefined
      ? Number(currentLine.counted_qty)
      : 0
  );

  useEffect(() => {
    if (currentLine) {
      setCountedQty(
        currentLine.counted_qty !== null && currentLine.counted_qty !== undefined
          ? Number(currentLine.counted_qty)
          : 0
      );
    }
  }, [currentIndex, currentLine]);

  const countedCount = localLines.filter((l) => l.counted_qty !== null).length;
  const progressPct = localLines.length > 0 ? Math.round((countedCount / localLines.length) * 100) : 0;

  const handleSaveAndNext = () => {
    if (!currentLine) return;

    // Mode Offline Langsung
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      enqueueOutboxItem("STOCK_COUNT", {
        lineId: currentLine.id,
        countedQty,
        countedByPersonId: counterPersonId,
      }).then(() => {
        notifyOutboxChanged();
        // Update local state optimistically
        setLocalLines((prev) =>
          prev.map((l, idx) =>
            idx === currentIndex
              ? { ...l, counted_qty: countedQty, counted_by_person_id: counterPersonId, status: "COUNTED" }
              : l
          )
        );

        if (typeof window !== "undefined" && window.navigator?.vibrate) {
          window.navigator.vibrate(50);
        }

        if (currentIndex < localLines.length - 1) {
          setCurrentIndex((prev) => prev + 1);
        }
      });
      return;
    }

    startTransition(async () => {
      try {
        const res = await submitCountLineAction({
          lineId: currentLine.id,
          countedQty,
          countedByPersonId: counterPersonId,
        });

        if (res.success) {
          // Update local state
          setLocalLines((prev) =>
            prev.map((l, idx) =>
              idx === currentIndex
                ? { ...l, counted_qty: countedQty, counted_by_person_id: counterPersonId, status: "COUNTED" }
                : l
            )
          );

          if (typeof window !== "undefined" && window.navigator?.vibrate) {
            window.navigator.vibrate(50);
          }

          if (currentIndex < localLines.length - 1) {
            setCurrentIndex((prev) => prev + 1);
          }
        }
      } catch (networkErr) {
        console.warn("Koneksi gagal, menyimpan hitungan ke antrean offline:", networkErr);
        await enqueueOutboxItem("STOCK_COUNT", {
          lineId: currentLine.id,
          countedQty,
          countedByPersonId: counterPersonId,
        });
        notifyOutboxChanged();

        setLocalLines((prev) =>
          prev.map((l, idx) =>
            idx === currentIndex
              ? { ...l, counted_qty: countedQty, counted_by_person_id: counterPersonId, status: "COUNTED" }
              : l
          )
        );

        if (currentIndex < localLines.length - 1) {
          setCurrentIndex((prev) => prev + 1);
        }
      }
    });
  };

  if (!currentLine) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-2xl text-center space-y-4">
        <p className="text-sm text-[var(--slate-700)]">Tidak ada item yang ditemukan pada sesi ini.</p>
        <Link href="/opname" className="text-xs text-[var(--emerald-700)] font-bold">
          &larr; Kembali ke Daftar Sesi
        </Link>
      </div>
    );
  }

  const isCurrentCounted = currentLine.counted_qty !== null;

  return (
    <div className="max-w-md mx-auto space-y-4 pb-20">
      {/* Top Bar Header */}
      <div className="flex items-center justify-between gap-2">
        <Link
          href={`/opname/${stockTake.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--slate-700)] hover:text-[var(--emerald-700)] touch-target shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Review Sesi</span>
        </Link>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          <OpnameGuideModal />
          <button
            onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[var(--slate-200)] text-xs font-semibold text-[var(--slate-700)] touch-target shadow-xs shrink-0"
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>Daftar ({countedCount}/{localLines.length})</span>
          </button>
        </div>
      </div>

      {/* Progress & Penghitung Selector */}
      <div className="bg-white rounded-2xl p-4 border border-[var(--slate-200)] shadow-xs space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-[var(--slate-900)]">
            Item ke-{currentIndex + 1} dari {localLines.length}
          </span>
          <span className="num-mono font-bold text-[var(--emerald-700)]">
            {countedCount} Terhitung ({progressPct}%)
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[var(--emerald-500)] to-[var(--emerald-600)] transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Pemilihan Identitas Penghitung */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold text-[var(--slate-700)] flex items-center gap-1 shrink-0">
            <User className="w-3 h-3 text-[var(--emerald-600)]" />
            <span>Penghitung:</span>
          </span>
          <select
            value={counterPersonId}
            onChange={(e) => setCounterPersonId(e.target.value)}
            className="text-xs py-1.5 px-2 rounded-lg border border-[var(--slate-200)] bg-[var(--bg-canvas)] text-[var(--slate-900)] font-semibold max-w-[220px] truncate focus:outline-none"
          >
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Single Card - Focus Mode */}
      <div className="bg-white rounded-2xl p-6 border border-[var(--slate-200)] shadow-sm space-y-6 text-center">
        {/* Badges */}
        <div className="flex items-center justify-center gap-2">
          <span className="num-mono font-bold text-xs px-2.5 py-1 rounded bg-[var(--emerald-50)] text-[var(--emerald-700)] border border-[var(--emerald-500)]/20">
            {currentLine.item?.code}
          </span>
          <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
            {currentLine.item?.category?.name}
          </span>
          {isCurrentCounted && (
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-[var(--emerald-50)] text-[var(--emerald-700)] font-semibold">
              <CheckCircle2 className="w-3 h-3" />
              Sudah Dihitung
            </span>
          )}
        </div>

        {/* Item Name */}
        <div>
          <h2 className="text-2xl font-bold text-[var(--slate-900)] tracking-tight leading-snug">
            {currentLine.item?.name}
          </h2>
          <p className="text-xs text-[var(--slate-400)] mt-1">
            Satuan: <strong className="text-[var(--slate-700)]">{currentLine.item?.unit?.name}</strong>
          </p>
        </div>

        {/* Stepper Besar (Target Sentuh Minimal 48px) */}
        <div className="bg-[var(--bg-canvas)] p-3 rounded-2xl border border-[var(--slate-200)]">
          <span className="text-xs font-bold text-[var(--slate-400)] uppercase tracking-wider block mb-2">
            Hasil Hitung Fisik Nyata
          </span>

          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setCountedQty((prev) => Math.max(0, prev - 1))}
              className="w-16 h-16 rounded-2xl bg-white border border-[var(--slate-200)] flex items-center justify-center text-slate-700 shadow-xs active:scale-90 touch-target text-2xl font-bold transition-transform"
            >
              <Minus className="w-7 h-7" />
            </button>

            <div className="flex-1">
              <input
                type="number"
                min="0"
                value={countedQty}
                onChange={(e) => setCountedQty(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full text-center text-4xl sm:text-5xl font-bold text-[var(--slate-900)] bg-transparent focus:outline-none num-mono tracking-tight"
              />
              <span className="text-xs font-semibold text-[var(--slate-400)] block mt-1">
                {currentLine.item?.unit?.name}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setCountedQty((prev) => prev + 1)}
              className="w-16 h-16 rounded-2xl bg-white border border-[var(--slate-200)] flex items-center justify-center text-slate-700 shadow-xs active:scale-90 touch-target text-2xl font-bold transition-transform"
            >
              <Plus className="w-7 h-7" />
            </button>
          </div>
        </div>

        {/* Banner Blind Count Notice */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-[var(--slate-400)] flex items-center justify-center gap-2">
          <EyeOff className="w-4 h-4 text-slate-400 shrink-0" />
          <span>Stok sistem sengaja disembunyikan agar hitungan objektif.</span>
        </div>

        {/* Thumb-Zone Actions */}
        <div className="space-y-2 pt-2">
          <button
            type="button"
            disabled={isPending}
            onClick={handleSaveAndNext}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-[var(--emerald-600)] to-[var(--emerald-700)] text-white font-bold text-base shadow-sm hover:from-[var(--emerald-700)] hover:to-[var(--emerald-700)] active:scale-98 touch-target transition-all"
          >
            {isPending
              ? "Menyimpan..."
              : currentIndex === localLines.length - 1
              ? "Simpan Item Terakhir"
              : "Simpan & Lanjut Item Berikutnya"}
          </button>

          {/* Navigasi Prev / Next Tanpa Simpan */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              className={cn(
                "flex-1 py-2.5 rounded-xl border border-[var(--slate-200)] text-xs font-semibold touch-target flex items-center justify-center gap-1",
                currentIndex === 0 ? "opacity-40 cursor-not-allowed bg-slate-50" : "bg-white text-[var(--slate-700)] hover:bg-slate-50"
              )}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Sebelumnya</span>
            </button>

            <button
              type="button"
              disabled={currentIndex >= localLines.length - 1}
              onClick={() => setCurrentIndex((prev) => Math.min(localLines.length - 1, prev + 1))}
              className={cn(
                "flex-1 py-2.5 rounded-xl border border-[var(--slate-200)] text-xs font-semibold touch-target flex items-center justify-center gap-1",
                currentIndex >= localLines.length - 1
                  ? "opacity-40 cursor-not-allowed bg-slate-50"
                  : "bg-white text-[var(--slate-700)] hover:bg-slate-50"
              )}
            >
              <span>Lewati / Berikutnya</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Drawer Daftar Seluruh Item */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md max-h-[80vh] rounded-t-3xl sm:rounded-2xl p-5 border border-[var(--slate-200)] shadow-xl flex flex-col space-y-4 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[var(--slate-900)]">Daftar Item Sesi Opname</h3>
                <p className="text-xs text-[var(--slate-400)]">{countedCount} dari {localLines.length} item telah dihitung</p>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="p-2 text-slate-400 hover:text-slate-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 -mx-5 px-5">
              {localLines.map((line, idx) => {
                const isCounted = line.counted_qty !== null;
                const isSelected = idx === currentIndex;
                return (
                  <button
                    key={line.id}
                    onClick={() => {
                      setCurrentIndex(idx);
                      setDrawerOpen(false);
                    }}
                    className={cn(
                      "w-full py-3 text-left flex items-center justify-between gap-2 touch-target transition-colors",
                      isSelected ? "bg-[var(--emerald-50)]/50 -mx-5 px-5" : "hover:bg-slate-50"
                    )}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="num-mono font-bold text-xs text-[var(--emerald-700)]">{line.item?.code}</span>
                        <span className="text-xs font-semibold text-[var(--slate-900)]">{line.item?.name}</span>
                      </div>
                      <span className="text-[11px] text-[var(--slate-400)]">{line.item?.category?.name}</span>
                    </div>

                    {isCounted ? (
                      <span className="num-mono font-bold text-xs px-2 py-0.5 rounded-full bg-[var(--emerald-50)] text-[var(--emerald-700)] border border-[var(--emerald-500)]/20">
                        {line.counted_qty} {line.item?.unit?.name}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">Belum dihitung</span>
                    )}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setDrawerOpen(false)}
              className="w-full py-3 rounded-xl bg-slate-900 text-white font-semibold text-xs touch-target"
            >
              Tutup Daftar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
