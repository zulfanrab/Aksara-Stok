"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  Plus,
  Filter,
  Tag,
  Layers,
  Info,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
} from "lucide-react";
import type { Item, Category, Unit } from "@/types/inventory";
import { createItemAction } from "@/lib/actions/stock";
import { cn } from "@/lib/utils";

interface BarangClientProps {
  initialItems: Item[];
  categories: Category[];
  units?: Unit[];
}

export function BarangClient({ initialItems, categories, units = [] }: BarangClientProps) {
  const router = useRouter();
  const [itemsList, setItemsList] = useState<Item[]>(initialItems);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  // State Modal Tambah Barang Baru
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("IT");
  const [newItemUnit, setNewItemUnit] = useState("Unit");
  const [customUnit, setCustomUnit] = useState("");
  const [newItemKind, setNewItemKind] = useState<"CONSUMABLE" | "PPE" | "INSTRUMENT" | "SERVICE">("INSTRUMENT");
  const [newItemMinStock, setNewItemMinStock] = useState("1");
  const [customCode, setCustomCode] = useState("");
  const [addError, setAddError] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Filter items berdasarkan kategori dan kata kunci pencarian
  const filteredItems = useMemo(() => {
    let result = itemsList;

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
  }, [itemsList, selectedCategory, search]);

  // Daftar Kategori gabungan (termasuk IT jika belum ada di database)
  const allCategoryOptions = useMemo(() => {
    const hasIT = categories.some((c) => c.code === "IT");
    if (!hasIT) {
      return [
        { id: "cat-it", code: "IT", name: "Peralatan IT & Multimedia", kind: "INSTRUMENT" as const },
        ...categories,
      ];
    }
    return categories;
  }, [categories]);

  const categoryChips = [
    { code: "ALL", name: "Semua Kategori", count: itemsList.length },
    ...allCategoryOptions.map((c) => ({
      code: c.code,
      name: c.name,
      count: itemsList.filter((i) => i.category?.code === c.code).length,
    })),
  ];

  // Daftar Pilihan Satuan
  const defaultUnitNames = ["Unit", "Pcs", "Box", "Rim", "Lembar", "Set", "Roll", "Botol", "Pack", "Kg"];
  const unitOptions = useMemo(() => {
    const set = new Set([...defaultUnitNames, ...units.map((u) => u.name)]);
    return Array.from(set);
  }, [units]);

  const handleSaveItem = async () => {
    if (!newItemName.trim()) {
      setAddError("Nama barang wajib diisi.");
      return;
    }

    const effectiveUnit = newItemUnit === "CUSTOM" ? customUnit.trim() : newItemUnit;
    if (!effectiveUnit) {
      setAddError("Nama satuan wajib diisi.");
      return;
    }

    setAddError("");
    setIsAdding(true);

    try {
      const res = await createItemAction({
        name: newItemName.trim(),
        categoryCode: newItemCategory,
        baseUnitName: effectiveUnit,
        minStock: Number(newItemMinStock) || 1,
        customCode: customCode.trim() || undefined,
        kind: newItemKind,
      });

      if (res.success && res.item) {
        setIsAddModalOpen(false);
        // Reset form
        setNewItemName("");
        setCustomCode("");
        setNewItemMinStock("1");
        setCustomUnit("");
        router.refresh();
      } else {
        setAddError(res.error || "Gagal menambahkan barang baru.");
      }
    } catch (err: any) {
      setAddError(err.message || "Terjadi kesalahan saat menyimpan barang.");
    } finally {
      setIsAdding(false);
    }
  };

  const getKindBadge = (kind: string) => {
    switch (kind) {
      case "CONSUMABLE":
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">Habis Pakai</span>;
      case "PPE":
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-200">APD</span>;
      case "INSTRUMENT":
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-50 text-sky-800 border border-sky-200">Alat / Aset</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">{kind}</span>;
    }
  };

  return (
    <div className="space-y-4 pb-24 md:pb-12">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Master Persediaan Barang
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Daftar master seluruh barang dan alat inventaris
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-xs touch-target transition-all"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Tambah Barang</span>
            </button>
            <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
              <span className="num-mono font-bold text-emerald-700">{filteredItems.length}</span>
              <span>dari {itemsList.length}</span>
            </div>
          </div>
        </div>

        {/* Search Bar - Touch Target Minimal 48px */}
        <div className="relative mt-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama barang atau kode..."
            className="w-full pl-11 pr-10 py-3.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 touch-target transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-700 touch-target"
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
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100"
                )}
              >
                <span>{chip.name}</span>
                <span
                  className={cn(
                    "px-1.5 py-0.2 rounded-full text-[10px] num-mono font-bold",
                    isSelected ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                  )}
                >
                  {chip.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Item List Table / Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Info className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">Barang tidak ditemukan</p>
            <p className="text-xs text-slate-400">Coba kata kunci lain atau pilih Semua Kategori.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Kode</th>
                  <th className="py-3 px-4">Kode Lama</th>
                  <th className="py-3 px-4">Nama Barang</th>
                  <th className="py-3 px-4 hidden md:table-cell">Kategori</th>
                  <th className="py-3 px-4 hidden sm:table-cell">Jenis</th>
                  <th className="py-3 px-4 text-center">Satuan</th>
                  <th className="py-3 px-4 text-center">Min Stok</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors active:bg-slate-100 touch-target"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-emerald-800 whitespace-nowrap">
                      {item.code}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 text-xs">
                      {item.legacy_code || "-"}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {item.name}
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell text-slate-600 text-xs">
                      {item.category?.name || "-"}
                    </td>
                    <td className="py-3 px-4 hidden sm:table-cell whitespace-nowrap">
                      {getKindBadge(item.kind)}
                    </td>
                    <td className="py-3 px-4 text-center font-medium text-slate-700">
                      {item.unit?.name || "-"}
                    </td>
                    <td className="py-3 px-4 text-center num-mono font-bold text-slate-700">
                      {item.min_stock}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                        <Clock className="w-3 h-3 text-slate-400" />
                        Belum dihitung
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DETAIL BARANG */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-5 border border-slate-200 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {selectedItem.code}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-2">
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

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-500 block">Kode Lama</span>
                <span className="font-semibold text-slate-900 num-mono">
                  {selectedItem.legacy_code || "Tidak ada"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Kategori</span>
                <span className="font-semibold text-slate-900">
                  {selectedItem.category?.name}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Jenis Barang</span>
                <span className="font-semibold text-slate-900">
                  {selectedItem.kind}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Satuan Dasar</span>
                <span className="font-semibold text-slate-900">
                  {selectedItem.unit?.name}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Batas Minimum</span>
                <span className="font-bold text-slate-900 num-mono">
                  {selectedItem.min_stock} {selectedItem.unit?.name}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Target Persediaan</span>
                <span className="font-bold text-slate-900 num-mono">
                  {selectedItem.target_stock} {selectedItem.unit?.name}
                </span>
              </div>
            </div>

            <div className="text-xs text-slate-500 leading-relaxed">
              * Saldo fisik diperbarui otomatis melalui sesi opname fisik dan pencatatan transaksi masuk/keluar.
            </div>

            <div className="pt-2">
              <button
                onClick={() => setSelectedItem(null)}
                className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-xs touch-target hover:bg-slate-800"
              >
                Tutup Rincian
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH BARANG BARU */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Tambah Barang Baru
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Daftarkan barang, alat kerja, atau inventaris baru
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setAddError("");
                }}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg touch-target"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {addError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-900">
                {addError}
              </div>
            )}

            <div className="space-y-3.5">
              {/* Nama Barang */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800">
                  Nama Barang <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="Misal: Tripod Kamera, Charger Sony, dll."
                  className="w-full p-3 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none touch-target"
                />
              </div>

              {/* Kategori */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800">
                  Kategori <span className="text-rose-600">*</span>
                </label>
                <select
                  value={newItemCategory}
                  onChange={(e) => {
                    const catCode = e.target.value;
                    setNewItemCategory(catCode);
                    if (catCode === "IT" || catCode === "ALT") {
                      setNewItemKind("INSTRUMENT");
                    } else if (catCode === "APD") {
                      setNewItemKind("PPE");
                    } else {
                      setNewItemKind("CONSUMABLE");
                    }
                  }}
                  className="w-full p-3 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none touch-target"
                >
                  <option value="IT">Peralatan IT & Multimedia (IT)</option>
                  {allCategoryOptions
                    .filter((c) => c.code !== "IT")
                    .map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                </select>
              </div>

              {/* Satuan & Jenis */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800">
                    Satuan Dasar <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={newItemUnit}
                    onChange={(e) => setNewItemUnit(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none touch-target"
                  >
                    {unitOptions.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                    <option value="CUSTOM">+ Lainnya...</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800">
                    Jenis Barang
                  </label>
                  <select
                    value={newItemKind}
                    onChange={(e) => setNewItemKind(e.target.value as any)}
                    className="w-full p-3 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none touch-target"
                  >
                    <option value="INSTRUMENT">Alat / Aset</option>
                    <option value="CONSUMABLE">Habis Pakai</option>
                    <option value="PPE">APD</option>
                  </select>
                </div>
              </div>

              {newItemUnit === "CUSTOM" && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800">
                    Ketik Nama Satuan Baru
                  </label>
                  <input
                    type="text"
                    value={customUnit}
                    onChange={(e) => setCustomUnit(e.target.value)}
                    placeholder="Misal: Paket, Pasang, Botol"
                    className="w-full p-3 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none touch-target"
                  />
                </div>
              )}

              {/* Batas Minimum & Target Stok */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800">
                    Batas Minimum Stok
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newItemMinStock}
                    onChange={(e) => setNewItemMinStock(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none touch-target num-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800">
                    Kode Khusus (Opsional)
                  </label>
                  <input
                    type="text"
                    value={customCode}
                    onChange={(e) => setCustomCode(e.target.value)}
                    placeholder="Otomatis (contoh: IT-001)"
                    className="w-full p-3 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none touch-target"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-3">
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setAddError("");
                }}
                className="flex-1 py-3 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold text-xs touch-target hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isAdding || !newItemName.trim()}
                onClick={handleSaveItem}
                className={cn(
                  "flex-1 py-3 rounded-xl font-bold text-xs text-white shadow-xs touch-target transition-all",
                  isAdding || !newItemName.trim()
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-700"
                )}
              >
                {isAdding ? "Menyimpan..." : "Simpan Barang Baru"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
