"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  User,
  EyeOff,
  CheckCircle2,
  ListFilter,
  X,
  ShieldAlert,
  WifiOff,
  RotateCcw,
  Search,
  Camera,
  Package,
} from "lucide-react";
import type { StockTakeWithDetails, StockTakeLineWithItem } from "@/lib/services/inventory";
import type { Person } from "@/types/inventory";
import { submitCountLineAction } from "@/lib/actions/opname";
import { enqueueOutboxItem } from "@/lib/offline/db";
import { notifyOutboxChanged } from "@/lib/offline/sync";
import { OpnameGuideModal } from "@/components/opname/OpnameGuideModal";
import { getItemPhotoPublicUrl } from "@/lib/storage";
import { ImageLightboxModal } from "@/components/camera/ImageLightboxModal";
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
  const [drawerSearch, setDrawerSearch] = useState("");
  const [drawerFilter, setDrawerFilter] = useState<"ALL" | "UNCOUNTED" | "COUNTED">("ALL");

  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxTitle, setLightboxTitle] = useState<string>("");

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

  // Filter items di drawer modal
  const filteredDrawerLines = useMemo(() => {
    return localLines
      .map((line, idx) => ({ ...line, originalIndex: idx }))
      .filter((line) => {
        const isCounted = line.counted_qty !== null;
        if (drawerFilter === "UNCOUNTED" && isCounted) return false;
        if (drawerFilter === "COUNTED" && !isCounted) return false;

        if (drawerSearch.trim()) {
          const q = drawerSearch.trim().toLowerCase();
          const matchName = line.item?.name.toLowerCase().includes(q);
          const matchCode = line.item?.code.toLowerCase().includes(q);
          const matchCat = line.item?.category?.name.toLowerCase().includes(q);
          return matchName || matchCode || matchCat;
        }
        return true;
      });
  }, [localLines, drawerFilter, drawerSearch]);

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
      <div className="max-w-md mx-auto p-8 bg-white rounded-3xl text-center space-y-4 border border-slate-200 shadow-xs">
        <p className="text-sm font-bold text-slate-800">Tidak ada item yang ditemukan pada sesi ini.</p>
        <Link
          href="/opname"
          className="inline-block px-4 py-2 rounded-xl bg-emerald-50 text-emerald-800 font-bold text-xs"
        >
          &larr; Kembali ke Daftar Sesi
        </Link>
      </div>
    );
  }

  const isCurrentCounted = currentLine.counted_qty !== null;
  const currentPhotoUrl = getItemPhotoPublicUrl(currentLine.item?.photo_path || currentLine.photo_path);

  return (
    <div className="max-w-md mx-auto space-y-4 pb-24 md:pb-12">
      {/* Top Bar Header */}
      <div className="flex items-center justify-between gap-2">
        <Link
          href={`/opname/${stockTake.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-emerald-700 touch-target shrink-0 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Review Sesi</span>
        </Link>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          <OpnameGuideModal />
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 touch-target shadow-2xs hover:bg-slate-50 shrink-0 transition-colors"
          >
            <ListFilter className="w-4 h-4 text-emerald-600" />
            <span>
              Daftar ({countedCount}/{localLines.length})
            </span>
          </button>
        </div>
      </div>

      {/* Progress & Penghitung Selector */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-900">
            Item ke-{currentIndex + 1} dari {localLines.length}
          </span>
          <span className="num-mono font-bold text-emerald-700">
            {countedCount} Terhitung ({progressPct}%)
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-300 rounded-full"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Pemilihan Identitas Penghitung */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1 shrink-0">
            <User className="w-3.5 h-3.5 text-emerald-600" />
            <span>Petugas Hitung:</span>
          </span>
          <select
            value={counterPersonId}
            onChange={(e) => setCounterPersonId(e.target.value)}
            className="text-xs py-1.5 px-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-bold max-w-[220px] truncate focus:outline-none focus:ring-2 focus:ring-emerald-600"
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
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-5 text-center">
        {/* Badges */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <span className="num-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
            {currentLine.item?.code}
          </span>
          <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold">
            {currentLine.item?.category?.name}
          </span>
          {isCurrentCounted && (
            <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Sudah Dihitung
            </span>
          )}
        </div>

        {/* Item Photo & Name */}
        <div className="space-y-3">
          {currentPhotoUrl ? (
            <button
              type="button"
              onClick={() => {
                setLightboxUrl(currentPhotoUrl);
                setLightboxTitle(currentLine.item?.name || "Foto Barang");
              }}
              className="relative mx-auto w-24 h-24 rounded-2xl overflow-hidden border-2 border-slate-200 shadow-2xs group hover:opacity-90 active:scale-95 transition-all block"
              title="Perbesar Foto Fisik"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentPhotoUrl}
                alt={currentLine.item?.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
              <div className="absolute bottom-0 inset-x-0 bg-black/50 text-[10px] text-white py-0.5 font-semibold">
                Foto Acuan
              </div>
            </button>
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center border border-slate-200">
              <Package className="w-8 h-8 stroke-[1.8]" />
            </div>
          )}

          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-snug">
              {currentLine.item?.name}
            </h2>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Satuan hitung: <strong className="text-slate-800 font-bold">{currentLine.item?.unit?.name}</strong>
            </p>
          </div>
        </div>

        {/* Stepper Besar (Target Sentuh Ergonomis untuk Lapangan) */}
        <div className="bg-slate-50 p-3 sm:p-4 rounded-3xl border border-slate-200 space-y-3">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Hasil Hitung Fisik Nyata di Rak
          </span>

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setCountedQty((prev) => Math.max(0, prev - 1))}
              className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-800 shadow-xs active:scale-90 touch-target text-2xl font-bold transition-transform"
              aria-label="Kurangi 1"
            >
              <Minus className="w-7 h-7 stroke-[2.5]" />
            </button>

            <div className="flex-1">
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={countedQty}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setCountedQty(isNaN(val) ? 0 : Math.max(0, val));
                }}
                className="w-full text-center text-4xl sm:text-5xl font-black text-slate-900 bg-transparent focus:outline-none num-mono tracking-tight"
              />
              <span className="text-xs font-bold text-slate-500 block mt-1">
                {currentLine.item?.unit?.name}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setCountedQty((prev) => prev + 1)}
              className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-800 shadow-xs active:scale-90 touch-target text-2xl font-bold transition-transform"
              aria-label="Tambah 1"
            >
              <Plus className="w-7 h-7 stroke-[2.5]" />
            </button>
          </div>

          {/* Quick Chips untuk Hitungan Cepat di Gudang */}
          <div className="flex items-center justify-center gap-1.5 flex-wrap pt-1">
            <button
              type="button"
              onClick={() => setCountedQty(0)}
              className="px-2.5 py-1.5 rounded-xl bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-800 text-xs font-bold touch-target active:scale-95 transition-all"
            >
              Kosong (0)
            </button>
            {[1, 5, 10, 25, 50, 100].map((inc) => (
              <button
                key={inc}
                type="button"
                onClick={() => setCountedQty((prev) => prev + inc)}
                className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 text-slate-700 text-xs font-bold touch-target active:scale-95 transition-all shadow-2xs"
              >
                +{inc}
              </button>
            ))}
          </div>
        </div>

        {/* Banner Blind Count Notice */}
        <div className="p-3 rounded-2xl bg-slate-100/70 border border-slate-200 text-xs text-slate-500 flex items-center justify-center gap-2">
          <EyeOff className="w-4 h-4 text-slate-400 shrink-0" />
          <span>Stok sistem disembunyikan agar hasil hitungan fisik objektif.</span>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-1">
          <button
            type="button"
            disabled={isPending}
            onClick={handleSaveAndNext}
            className="w-full min-h-[56px] py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold text-base shadow-sm active:scale-98 touch-target transition-all"
          >
            {isPending
              ? "Menyimpan Hitungan..."
              : currentIndex === localLines.length - 1
              ? "Simpan Item Terakhir"
              : "Simpan & Lanjut Item Berikutnya"}
          </button>

          {/* Navigasi Prev / Next Tanpa Simpan */}
          <div className="flex items-center justify-between gap-2.5 pt-1">
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              className={cn(
                "flex-1 min-h-[46px] py-2.5 rounded-2xl border border-slate-200 text-xs font-bold touch-target flex items-center justify-center gap-1 transition-colors",
                currentIndex === 0
                  ? "opacity-40 cursor-not-allowed bg-slate-50 text-slate-400"
                  : "bg-white text-slate-700 hover:bg-slate-50"
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
                "flex-1 min-h-[46px] py-2.5 rounded-2xl border border-slate-200 text-xs font-bold touch-target flex items-center justify-center gap-1 transition-colors",
                currentIndex >= localLines.length - 1
                  ? "opacity-40 cursor-not-allowed bg-slate-50 text-slate-400"
                  : "bg-white text-slate-700 hover:bg-slate-50"
              )}
            >
              <span>Berikutnya</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Drawer Daftar Seluruh Item dengan Pencarian Cepat */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md max-h-[85vh] rounded-t-3xl sm:rounded-3xl p-5 border border-slate-200 shadow-2xl flex flex-col space-y-3.5 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Daftar Item Sesi Opname</h3>
                <p className="text-xs text-slate-500 font-medium">
                  {countedCount} dari {localLines.length} item telah dihitung
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl touch-target"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Pencarian di dalam Drawer */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={drawerSearch}
                onChange={(e) => setDrawerSearch(e.target.value)}
                placeholder="Cari kode atau nama barang di sesi ini..."
                className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
              {drawerSearch && (
                <button
                  type="button"
                  onClick={() => setDrawerSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Status Hitung */}
            <div className="flex items-center gap-1.5">
              {[
                { id: "ALL", label: `Semua (${localLines.length})` },
                { id: "UNCOUNTED", label: `Belum (${localLines.length - countedCount})` },
                { id: "COUNTED", label: `Sudah (${countedCount})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setDrawerFilter(tab.id as any)}
                  className={cn(
                    "flex-1 py-1.5 rounded-xl text-[11px] font-bold transition-colors touch-target",
                    drawerFilter === tab.id
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Item List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 -mx-5 px-5 min-h-[220px]">
              {filteredDrawerLines.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Tidak ada item yang cocok dengan pencarian.
                </div>
              ) : (
                filteredDrawerLines.map((line) => {
                  const isCounted = line.counted_qty !== null;
                  const isSelected = line.originalIndex === currentIndex;

                  return (
                    <button
                      key={line.id}
                      type="button"
                      onClick={() => {
                        setCurrentIndex(line.originalIndex);
                        setDrawerOpen(false);
                      }}
                      className={cn(
                        "w-full py-3 text-left flex items-center justify-between gap-2.5 touch-target transition-colors",
                        isSelected ? "bg-emerald-50/70 -mx-5 px-5" : "hover:bg-slate-50"
                      )}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="num-mono font-bold text-xs text-emerald-800">
                            {line.item?.code}
                          </span>
                          <span className="text-xs font-semibold text-slate-900 truncate">
                            {line.item?.name}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500">
                          {line.item?.category?.name}
                        </span>
                      </div>

                      <div className="shrink-0 text-right">
                        {isCounted ? (
                          <span className="num-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {line.counted_qty} {line.item?.unit?.name}
                          </span>
                        ) : (
                          <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-semibold border border-amber-200">
                            Belum
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="w-full min-h-[46px] py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs touch-target transition-colors"
            >
              Tutup Daftar
            </button>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxUrl && (
        <ImageLightboxModal
          isOpen={true}
          onClose={() => setLightboxUrl(null)}
          imageUrl={lightboxUrl}
          title={lightboxTitle}
          altText={lightboxTitle}
        />
      )}
    </div>
  );
}
