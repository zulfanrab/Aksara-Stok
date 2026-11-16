"use client";

import { useState, useMemo } from "react";
import { Search, X, Filter, Tag, Layers, Info, CheckCircle2, AlertTriangle, AlertCircle, Clock } from "lucide-react";
import type { Item, Category } from "@/types/inventory";
import { cn } from "@/lib/utils";

interface BarangClientProps {
  initialItems: Item[];
  categories: Category[];
}

export function BarangClient({ initialItems, categories }: BarangClientProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  // Filter items berdasarkan kategori dan kata kunci pencarian
  const filteredItems = useMemo(() => {
    let result = initialItems;

    if (selectedCategory !== "ALL") {
      result = result.filter((item) => item.category?.code === selectedCategory);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.code.toLowerCase().includes(q) ||
          (item.legacy_code && item.legacy_code.toLowerCase().includes(q))
      );
    }

    return result;
  }, [initialItems, selectedCategory, search]);

  const categoryChips = [
    { code: "ALL", name: "Semua Kategori", count: initialItems.length },
    ...categories.map((c) => ({
      code: c.code,
      name: c.name,
      count: initialItems.filter((i) => i.category?.code === c.code).length,
    })),
  ];

  const getKindBadge = (kind: string) => {
    switch (kind) {
      case "CONSUMABLE":
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-[var(--emerald-700)]">Habis Pakai</span>;
      case "PPE":
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-[var(--amber-700)]">APD</span>;
      case "INSTRUMENT":
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-sky-50 text-[var(--sky-700)]">Alat Ukur / Aset</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">{kind}</span>;
    }
  };

  return (
    <div className="space-y-4 pb-24 md:pb-12">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[var(--slate-200)] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--slate-900)] tracking-tight">
              Master Persediaan Barang
            </h1>
            <p className="text-xs text-[var(--slate-400)] mt-0.5">
              128 Item Terdaftar &bull; Hasil Pembersihan Data Excel Sesuai BLUEPRINT.md
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 self-start sm:self-auto px-3 py-1.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--slate-200)] text-xs font-semibold text-[var(--slate-700)]">
            <span className="num-mono font-bold text-[var(--emerald-700)]">{filteredItems.length}</span>
            <span>dari {initialItems.length} Barang</span>
          </div>
        </div>

        {/* Search Bar - Touch Target Minimal 48px */}
        <div className="relative mt-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--slate-400)] pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama barang, kode (ATK-001), atau kode Excel (1.1)..."
            className="w-full pl-11 pr-10 py-3.5 rounded-xl border border-[var(--slate-200)] bg-[var(--bg-canvas)] text-sm text-[var(--slate-900)] placeholder:text-[var(--slate-400)] focus:outline-none focus:ring-2 focus:ring-[var(--emerald-600)] focus:bg-white touch-target transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-[var(--slate-400)] hover:text-[var(--slate-700)] touch-target"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Category Horizontal Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pt-3 pb-1 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          {categoryChips.map((chip) => {
            const isSelected = selectedCategory === chip.code;
            return (
              <button
                key={chip.code}
                onClick={() => setSelectedCategory(chip.code)}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all touch-target shrink-0",
                  isSelected
                    ? "bg-gradient-to-r from-[var(--emerald-600)] to-[var(--emerald-700)] text-white shadow-xs"
                    : "bg-[var(--bg-canvas)] border border-[var(--slate-200)] text-[var(--slate-700)] hover:bg-slate-100"
                )}
              >
                <span>{chip.name}</span>
                <span
                  className={cn(
                    "px-1.5 py-0.2 rounded-full text-[10px] num-mono",
                    isSelected ? "bg-white/20 text-white" : "bg-slate-200/70 text-slate-600"
                  )}
                >
                  {chip.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Items List - Mobile Card View (< 640px) */}
      <div className="sm:hidden space-y-2.5">
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-[var(--slate-200)]">
            <Info className="w-10 h-10 text-[var(--slate-400)] mx-auto mb-2" />
            <p className="text-sm font-semibold text-[var(--slate-900)]">Barang tidak ditemukan</p>
            <p className="text-xs text-[var(--slate-400)] mt-1">Coba ubah kata kunci atau pilih kategori lain.</p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className="bg-white rounded-xl p-3.5 border border-[var(--slate-200)] shadow-xs active:bg-slate-50 transition-colors touch-target flex flex-col gap-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="num-mono font-bold text-xs px-2 py-0.5 rounded bg-[var(--emerald-50)] text-[var(--emerald-700)] border border-[var(--emerald-500)]/20">
                    {item.code}
                  </span>
                  {item.legacy_code && (
                    <span className="num-mono text-[11px] text-[var(--slate-400)] px-1.5 py-0.5 rounded bg-slate-100">
                      ex: {item.legacy_code}
                    </span>
                  )}
                </div>
                {getKindBadge(item.kind)}
              </div>

              <div>
                <h2 className="text-sm font-bold text-[var(--slate-900)] leading-tight">
                  {item.name}
                </h2>
                <p className="text-xs text-[var(--slate-400)] mt-0.5">
                  {item.category?.name} &bull; Satuan: <strong className="text-[var(--slate-700)]">{item.unit?.name}</strong>
                </p>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                <span className="text-[var(--slate-400)]">
                  Min: <strong className="text-[var(--slate-700)] num-mono">{item.min_stock}</strong> {item.unit?.name}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-[var(--slate-200)] text-[var(--slate-700)] text-[11px] font-medium">
                  <Clock className="w-3 h-3 text-[var(--slate-400)]" />
                  Belum dihitung
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Items Table - Tablet & Desktop View (>= 640px) */}
      <div className="hidden sm:block bg-white rounded-2xl border border-[var(--slate-200)] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--bg-canvas)] border-b border-[var(--slate-200)] text-xs font-bold text-[var(--slate-700)] uppercase">
              <tr>
                <th className="py-3 px-4">Kode</th>
                <th className="py-3 px-3">Kode Lama</th>
                <th className="py-3 px-4">Nama Barang</th>
                <th className="py-3 px-3">Kategori</th>
                <th className="py-3 px-3">Jenis</th>
                <th className="py-3 px-3">Satuan</th>
                <th className="py-3 px-3 num-mono text-right">Min Stok</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--slate-200)] text-xs sm:text-sm">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[var(--slate-400)]">
                    Tidak ada barang yang cocok dengan pencarian Anda.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-bold text-[var(--emerald-700)] num-mono">
                      {item.code}
                    </td>
                    <td className="py-3 px-3 text-[var(--slate-400)] num-mono">
                      {item.legacy_code || "-"}
                    </td>
                    <td className="py-3 px-4 font-semibold text-[var(--slate-900)]">
                      {item.name}
                    </td>
                    <td className="py-3 px-3 text-[var(--slate-700)]">
                      {item.category?.name}
                    </td>
                    <td className="py-3 px-3">
                      {getKindBadge(item.kind)}
                    </td>
                    <td className="py-3 px-3 font-medium text-[var(--slate-700)]">
                      {item.unit?.name}
                    </td>
                    <td className="py-3 px-3 num-mono text-right font-medium text-[var(--slate-900)]">
                      {item.min_stock}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white border border-[var(--slate-200)] text-[var(--slate-700)] text-xs font-medium">
                        <Clock className="w-3 h-3 text-[var(--slate-400)]" />
                        Belum dihitung
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Detail Barang */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-5 border border-[var(--slate-200)] shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div>
                <span className="num-mono font-bold text-sm px-2.5 py-1 rounded bg-[var(--emerald-50)] text-[var(--emerald-700)] border border-[var(--emerald-500)]/20">
                  {selectedItem.code}
                </span>
                <h3 className="text-lg font-bold text-[var(--slate-900)] mt-2 leading-tight">
                  {selectedItem.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg touch-target"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-[var(--bg-canvas)] p-3.5 rounded-xl border border-[var(--slate-200)]">
              <div>
                <span className="text-[var(--slate-400)] block">Kode Asli Excel</span>
                <span className="font-semibold text-[var(--slate-900)] num-mono">
                  {selectedItem.legacy_code || "Tidak ada"}
                </span>
              </div>
              <div>
                <span className="text-[var(--slate-400)] block">Kategori</span>
                <span className="font-semibold text-[var(--slate-900)]">
                  {selectedItem.category?.name}
                </span>
              </div>
              <div>
                <span className="text-[var(--slate-400)] block">Jenis Barang</span>
                <span className="font-semibold text-[var(--slate-900)]">
                  {selectedItem.kind}
                </span>
              </div>
              <div>
                <span className="text-[var(--slate-400)] block">Satuan Dasar</span>
                <span className="font-semibold text-[var(--slate-900)]">
                  {selectedItem.unit?.name}
                </span>
              </div>
              <div>
                <span className="text-[var(--slate-400)] block">Batas Minimum</span>
                <span className="font-bold text-[var(--slate-900)] num-mono">
                  {selectedItem.min_stock} {selectedItem.unit?.name}
                </span>
              </div>
              <div>
                <span className="text-[var(--slate-400)] block">Target Persediaan</span>
                <span className="font-bold text-[var(--slate-900)] num-mono">
                  {selectedItem.target_stock} {selectedItem.unit?.name}
                </span>
              </div>
            </div>

            <div className="text-xs text-[var(--slate-400)] leading-relaxed">
              * Saldo fisik belum tercatat. Saldo awal riil akan ditentukan melalui Sesi Opname Nol pada Langkah 4.
            </div>

            <button
              onClick={() => setSelectedItem(null)}
              className="w-full py-3 rounded-xl bg-[var(--slate-900)] text-white font-semibold text-sm touch-target hover:bg-slate-800 transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
