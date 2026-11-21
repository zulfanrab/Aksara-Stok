"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  Plus,
  Edit2,
  Lock,
  Unlock,
  Archive,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Package,
  Layers,
  MapPin,
  Clock,
  Sparkles,
  Camera,
  Trash2,
  FileSpreadsheet,
} from "lucide-react";
import type { Item, Category, Unit, Location } from "@/types/inventory";
import type { StockSummaryItem } from "@/lib/services/reports";
import { exportStockSummaryToExcel } from "@/lib/reports/export";
import {
  createItemAction,
  updateItemAction,
  toggleItemActiveAction,
  checkItemTransactionsAction,
  deleteItemAction,
  manualResequenceCategoryAction,
} from "@/lib/actions/stock";
import { updateItemPhotoAction } from "@/lib/actions/upload";
import { generateNextItemCode, findSimilarItems } from "@/lib/stock-logic";
import { PhotoCaptureModal } from "@/components/camera/PhotoCaptureModal";
import { PhotoThumbnail } from "@/components/camera/PhotoThumbnail";
import { ImageLightboxModal } from "@/components/camera/ImageLightboxModal";
import { getItemPhotoPublicUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

interface BarangClientProps {
  initialItems: Item[];
  categories: Category[];
  units?: Unit[];
  locations?: Location[];
}

export function BarangClient({
  initialItems,
  categories,
  units = [],
  locations = [],
}: BarangClientProps) {
  const router = useRouter();
  const [itemsList, setItemsList] = useState<Item[]>(initialItems);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  // State Pengecekan Riwayat Transaksi untuk Barang Terpilih
  const [itemTxInfo, setItemTxInfo] = useState<{
    loading: boolean;
    hasTransactions: boolean;
    count: number;
  }>({ loading: false, hasTransactions: false, count: 0 });

  // State Modal Tambah Barang Baru
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("ATK");
  const [newItemUnit, setNewItemUnit] = useState("Pcs");
  const [customUnit, setCustomUnit] = useState("");
  const [newItemMinStock, setNewItemMinStock] = useState("1");
  const [newItemLocation, setNewItemLocation] = useState("");
  const [addError, setAddError] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // State Modal Ubah Barang (Edit)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editCustomUnit, setEditCustomUnit] = useState("");
  const [editMinStock, setEditMinStock] = useState("1");
  const [editLocation, setEditLocation] = useState("");
  const [editError, setEditError] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isResequencing, setIsResequencing] = useState(false);

  // State Konfirmasi Ubah Kode/Satuan (jika belum ada transaksi)
  const [confirmUnlockCodeUnit, setConfirmUnlockCodeUnit] = useState(false);

  // State Modal Foto Barang (master item)
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxTitle, setLightboxTitle] = useState<string>("");

  // Sinkronisasi data saat router.refresh()
  useEffect(() => {
    setItemsList(initialItems);
  }, [initialItems]);

  // Saat item dipilih, cek apakah sudah memiliki transaksi di stock_movements
  useEffect(() => {
    if (!selectedItem) {
      setItemTxInfo({ loading: false, hasTransactions: false, count: 0 });
      return;
    }

    let isMounted = true;
    setItemTxInfo({ loading: true, hasTransactions: false, count: 0 });

    checkItemTransactionsAction(selectedItem.id).then((res) => {
      if (isMounted) {
        setItemTxInfo({
          loading: false,
          hasTransactions: res.hasTransactions,
          count: res.transactionCount,
        });
      }
    });

    return () => {
      isMounted = false;
    };
  }, [selectedItem]);

  // Daftar Kategori gabungan (termasuk IT)
  const allCategoryOptions = useMemo(() => {
    const hasIT = categories.some((c) => c.code === "IT");
    if (!hasIT) {
      return [
        ...categories,
        { id: "cat-it", code: "IT", name: "Peralatan IT & Multimedia", kind: "INSTRUMENT" as const },
      ];
    }
    return categories;
  }, [categories]);

  // Hitung jumlah aktif vs nonaktif
  const activeItems = useMemo(() => itemsList.filter((i) => i.is_active !== false), [itemsList]);
  const inactiveItems = useMemo(() => itemsList.filter((i) => i.is_active === false), [itemsList]);

  // Filter items berdasarkan kategori dan kata kunci pencarian
  const filteredItems = useMemo(() => {
    let result = itemsList;

    if (selectedCategory === "INACTIVE") {
      // Hanya barang nonaktif
      result = inactiveItems;
    } else {
      // Barang aktif normal
      result = activeItems;
      if (selectedCategory !== "ALL") {
        result = result.filter((item) => item.category?.code === selectedCategory);
      }
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

    // Urutkan prefix lalu nomor
    return [...result].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
  }, [itemsList, activeItems, inactiveItems, selectedCategory, search]);

  // Chip Filter Kategori Horizontal
  const categoryChips = [
    { code: "ALL", name: "Semua Kategori", count: activeItems.length },
    ...allCategoryOptions.map((c) => ({
      code: c.code,
      name: c.name,
      count: activeItems.filter((i) => i.category?.code === c.code).length,
    })),
    { code: "INACTIVE", name: "Arsip / Nonaktif", count: inactiveItems.length },
  ];

  // Daftar Pilihan Satuan
  const defaultUnitNames = ["Unit", "Pcs", "Box", "Rim", "Lembar", "Set", "Roll", "Botol", "Pack", "Kg"];
  const unitOptions = useMemo(() => {
    const set = new Set([...defaultUnitNames, ...units.map((u) => u.name)]);
    return Array.from(set);
  }, [units]);

  // Deteksi Nama Mirip Secara Real-Time untuk Tambah Barang
  const similarItemsToAdd = useMemo(() => {
    return findSimilarItems(newItemName, itemsList);
  }, [newItemName, itemsList]);

  // Deteksi Nama Mirip Secara Real-Time untuk Ubah Barang
  const similarItemsToEdit = useMemo(() => {
    return findSimilarItems(editName, itemsList, selectedItem?.id);
  }, [editName, itemsList, selectedItem]);

  // Pratinjau Kode Otomatis untuk Barang Baru (termasuk barang nonaktif)
  const previewNewCode = useMemo(() => {
    const existingCodes = itemsList.map((i) => i.code);
    return generateNextItemCode(newItemCategory, existingCodes);
  }, [newItemCategory, itemsList]);

  // Simpan Tambah Barang Baru
  const handleSaveNewItem = async () => {
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
      });

      if (res.success && res.item) {
        setIsAddModalOpen(false);
        setNewItemName("");
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

  // Buka Modal Edit Barang
  const handleOpenEditModal = () => {
    if (!selectedItem) return;
    setEditName(selectedItem.name);
    setEditCategory(selectedItem.category?.code || "ATK");
    setEditCode(selectedItem.code);
    setEditUnit(selectedItem.unit?.name || "Pcs");
    setEditCustomUnit("");
    setEditMinStock(String(selectedItem.min_stock || 0));
    setEditLocation(selectedItem.default_location_id || "");
    setEditError("");
    setConfirmUnlockCodeUnit(false);
    setIsEditModalOpen(true);
  };

  // Ubah Kategori di Modal Edit (Otomatis menyesuaikan Kode Baru di kategori tujuan)
  const handleEditCategoryChange = (newCatCode: string) => {
    setEditCategory(newCatCode);
    const oldCatCode = selectedItem?.category?.code || "";
    if (newCatCode !== oldCatCode) {
      // Cari kode barang yang ada di kategori tujuan (selain item yang sedang diedit)
      const targetExistingCodes = itemsList
        .filter((i) => i.id !== selectedItem?.id && i.category?.code === newCatCode)
        .map((i) => i.code);
      const nextCode = generateNextItemCode(newCatCode, targetExistingCodes);
      setEditCode(nextCode);
    } else {
      setEditCode(selectedItem?.code || "");
    }
  };

  // Simpan Perubahan Barang (Edit)
  const handleSaveEditItem = async () => {
    if (!selectedItem) return;
    if (!editName.trim()) {
      setEditError("Nama barang wajib diisi.");
      return;
    }

    const effectiveUnit = editUnit === "CUSTOM" ? editCustomUnit.trim() : editUnit;
    if (!effectiveUnit) {
      setEditError("Nama satuan wajib diisi.");
      return;
    }

    setEditError("");
    setIsSavingEdit(true);

    try {
      const res = await updateItemAction({
        itemId: selectedItem.id,
        name: editName.trim(),
        categoryCode: editCategory,
        minStock: Number(editMinStock) || 0,
        defaultLocationId: editLocation || null,
        code: editCode.trim().toUpperCase(),
        baseUnitName: !itemTxInfo.hasTransactions ? effectiveUnit : undefined,
      });

      if (res.success) {
        setIsEditModalOpen(false);
        setSelectedItem(null);
        router.refresh();
      } else {
        setEditError(res.error || "Gagal memperbarui barang.");
      }
    } catch (err: any) {
      setEditError(err.message || "Terjadi kesalahan saat menyimpan perubahan.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Hapus Master Barang Secara Permanen (Hanya jika belum memiliki mutasi)
  const handleDeleteItem = async (item: Item) => {
    if (itemTxInfo.hasTransactions) {
      alert(
        `Barang "${item.name}" (${item.code}) sudah memiliki ${itemTxInfo.count} catatan mutasi stok. Sesuai standar integritas sistem, barang tidak dapat dihapus permanen agar data historis tetap akurat. Silakan gunakan tombol "Nonaktifkan" untuk menyembunyikannya dari transaksi aktif.`
      );
      return;
    }

    const catName = item.category?.name || item.category?.code || "";
    const confirmMsg = `Hapus master barang "${item.name}" (${item.code}) secara permanen?\n\nUrutan nomor kode barang lain dalam kategori "${catName}" akan otomatis dirapikan kembali agar tidak ada nomor yang bolong.`;

    if (!window.confirm(confirmMsg)) return;

    setIsDeleting(true);
    try {
      const res = await deleteItemAction({ itemId: item.id });
      if (res.success) {
        setIsEditModalOpen(false);
        setSelectedItem(null);
        router.refresh();
      } else {
        alert(res.error || "Gagal menghapus barang.");
      }
    } catch (err: any) {
      alert(err.message || "Terjadi kesalahan saat menghapus barang.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Rapikan Nomor Urut Kode Barang Secara Manual untuk Kategori Terpilih
  const handleManualResequence = async (catCode: string) => {
    if (
      !window.confirm(
        `Rapikan nomor urut kode barang pada kategori ${catCode} agar berurutan kontinu (001, 002, ...) tanpa ada nomor yang bolong?`
      )
    ) {
      return;
    }
    setIsResequencing(true);
    try {
      const res = await manualResequenceCategoryAction(catCode);
      if (res.success) {
        router.refresh();
      } else {
        alert(res.error || `Gagal merapikan nomor urut kategori ${catCode}.`);
      }
    } catch (err: any) {
      alert(err.message || "Terjadi kesalahan.");
    } finally {
      setIsResequencing(false);
    }
  };

  // Ekspor Data Barang yang Difilter ke Excel (Lengkap dengan Foto)
  const handleExportFilteredToExcel = () => {
    const exportData: StockSummaryItem[] = filteredItems.map((item) => ({
      id: item.id,
      code: item.code,
      name: item.name,
      categoryName: item.category?.name || "Lainnya",
      categoryCode: item.category?.code || "-",
      unitName: item.unit?.name || "Pcs",
      currentStock: item.current_qty || 0,
      minStock: item.min_stock || 0,
      targetStock: item.target_stock || 0,
      status: item.stock_status === "HABIS" || item.stock_status === "MENIPIS" ? item.stock_status : "AMAN",
      kind: item.kind,
      photo_path: item.photo_path || null,
    }));
    exportStockSummaryToExcel(exportData, { generatedBy: "Admin Logistik" });
  };
  const handleToggleItemStatus = async (item: Item, newStatus: boolean) => {
    const actionLabel = newStatus ? "mengaktifkan kembali" : "menonaktifkan";
    const confirmMsg = newStatus
      ? `Aktifkan kembali barang "${item.name}" (${item.code})? Barang akan kembali muncul di daftar normal dan form transaksi.`
      : `Nonaktifkan barang "${item.name}" (${item.code})? Barang akan disembunyikan dari daftar normal dan form transaksi, namun kodenya tetap tercatat di sistem.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await toggleItemActiveAction(item.id, newStatus);
      if (res.success) {
        setSelectedItem(null);
        router.refresh();
      } else {
        alert(res.error || `Gagal ${actionLabel} barang.`);
      }
    } catch (err: any) {
      alert(err.message || `Terjadi kesalahan saat ${actionLabel} barang.`);
    }
  };

  // Callback setelah foto berhasil diupload: simpan path ke tabel items
  const handleItemPhotoUploaded = async (photoPath: string) => {
    if (!selectedItem) return;
    setIsPhotoModalOpen(false);
    const res = await updateItemPhotoAction(selectedItem.id, photoPath);
    if (res.success) {
      // Update state lokal agar foto langsung muncul tanpa full refresh
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qzqrgxkamixxgmggxhuq.supabase.co";
      const updatedItem: Item = {
        ...selectedItem,
        photo_path: photoPath,
      };
      setSelectedItem(updatedItem);
      setItemsList((prev) =>
        prev.map((it) => (it.id === selectedItem.id ? updatedItem : it))
      );
      router.refresh();
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
              Daftar master seluruh barang, peralatan kerja, dan inventaris gudang
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            {selectedCategory !== "ALL" && selectedCategory !== "INACTIVE" && (
              <button
                type="button"
                disabled={isResequencing}
                onClick={() => handleManualResequence(selectedCategory)}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 active:scale-95 text-slate-700 text-xs font-semibold touch-target transition-all"
                title={`Rapikan nomor urut barang pada kategori ${selectedCategory} agar kontinu (001, 002, ...)`}
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isResequencing ? "Merapikan..." : `Rapikan Nomor ${selectedCategory}`}</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleExportFilteredToExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 active:scale-95 text-emerald-800 text-xs font-semibold touch-target transition-all"
              title="Ekspor daftar barang yang difilter ke Excel lengkap dengan foto"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>Ekspor Excel</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAddError("");
                setIsAddModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 active:scale-95 text-white text-xs font-bold shadow-xs touch-target transition-all"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Tambah Barang</span>
            </button>
            <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
              <span className="num-mono font-bold text-emerald-700">{filteredItems.length}</span>
              <span>dari {itemsList.length} total</span>
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
            placeholder="Cari nama barang atau kode (contoh: ATK-001, Helm, Kertas)..."
            className="w-full pl-11 pr-10 py-3.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 touch-target transition-all"
          />
          {search && (
            <button
              type="button"
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
            const isInactiveTab = chip.code === "INACTIVE";

            return (
              <button
                key={chip.code}
                onClick={() => setSelectedCategory(chip.code)}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all touch-target shrink-0",
                  isSelected
                    ? isInactiveTab
                      ? "bg-gradient-to-r from-rose-600 to-rose-700 text-white shadow-sm font-bold border border-rose-700"
                      : "bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-sm font-bold border border-emerald-700"
                    : isInactiveTab
                    ? "bg-rose-50/70 border border-rose-200 text-rose-800 hover:bg-rose-100"
                    : "bg-white border border-slate-200 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/40"
                )}
              >
                <span>{chip.name}</span>
                <span
                  className={cn(
                    "px-1.5 py-0.2 rounded-full text-[10px] num-mono font-bold",
                    isSelected ? "bg-white/25 text-white" : isInactiveTab ? "bg-rose-200 text-rose-900" : "bg-slate-100 text-slate-600"
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
            <Package className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">Barang tidak ditemukan</p>
            <p className="text-xs text-slate-400">
              {selectedCategory === "INACTIVE"
                ? "Tidak ada barang yang sedang dinonaktifkan."
                : "Coba kata kunci lain atau pilih Semua Kategori."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Kode</th>
                  <th className="py-3 px-4">Nama Barang</th>
                  <th className="py-3 px-4 hidden md:table-cell">Kategori</th>
                  <th className="py-3 px-4 hidden sm:table-cell">Jenis</th>
                  <th className="py-3 px-4 text-center">Satuan</th>
                  <th className="py-3 px-4 text-center">Min Stok</th>
                  <th className="py-3 px-4 text-center hidden sm:table-cell">Foto</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={cn(
                      "cursor-pointer transition-colors touch-target",
                      item.is_active === false
                        ? "bg-slate-50/80 hover:bg-slate-100/80 opacity-75"
                        : "hover:bg-slate-50/80 active:bg-slate-100"
                    )}
                  >
                    <td className="py-3 px-4 font-mono font-bold text-emerald-800 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span>{item.code}</span>
                        {item.is_active === false && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-rose-100 text-rose-800 font-bold">
                            Nonaktif
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      <div>
                        <span>{item.name}</span>
                        {item.legacy_code && (
                          <span className="block text-[11px] text-slate-400 font-mono">
                            Eks: {item.legacy_code}
                          </span>
                        )}
                      </div>
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
                    <td className="py-3 px-4 text-center hidden sm:table-cell" onClick={(e) => e.stopPropagation()}>
                      {item.photo_path ? (
                        <PhotoThumbnail
                          photoPath={item.photo_path}
                          altText={item.name}
                        />
                      ) : (
                        <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-slate-100 text-slate-400" title="Belum ada foto">
                          <Camera className="w-4 h-4" />
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {item.is_active !== false ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Aktif</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700">
                          <Archive className="w-3.5 h-3.5" />
                          <span>Nonaktif</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DETAIL BARANG (DENGAN TOMBOL UBAH & NONAKTIFKAN) */}
      {selectedItem && !isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div>
                <span className="num-mono font-bold text-xs px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {selectedItem.code}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-2 leading-tight">
                  {selectedItem.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg touch-target"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status Transaksi Banner */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
              <span className="text-slate-600 font-medium">Status Mutasi Stok:</span>
              {itemTxInfo.loading ? (
                <span className="text-slate-400">Memeriksa...</span>
              ) : itemTxInfo.hasTransactions ? (
                <span className="font-bold text-emerald-800 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  <span>{itemTxInfo.count} transaksi tercatat</span>
                </span>
              ) : (
                <span className="font-bold text-amber-700 flex items-center gap-1">
                  <Unlock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Belum ada transaksi</span>
                </span>
              )}
            </div>

            {/* Foto Referensi Barang */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              {selectedItem.photo_path ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qzqrgxkamixxgmggxhuq.supabase.co"}/storage/v1/object/public/proof-photos/${selectedItem.photo_path}`}
                    alt={selectedItem.name}
                    className="w-full aspect-video object-cover cursor-pointer hover:opacity-95 transition-opacity"
                    onClick={() => {
                      const url = getItemPhotoPublicUrl(selectedItem.photo_path);
                      if (url) {
                        setLightboxUrl(url);
                        setLightboxTitle(`${selectedItem.name} (${selectedItem.code})`);
                      }
                    }}
                  />
                  <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/60 to-transparent flex items-center justify-between">
                    <span className="text-[11px] text-white font-semibold">📷 Foto Barang</span>
                    <button
                      type="button"
                      onClick={() => setIsPhotoModalOpen(true)}
                      className="text-[11px] text-white/80 hover:text-white underline"
                    >
                      Ganti Foto
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsPhotoModalOpen(true)}
                  className="w-full py-6 flex flex-col items-center gap-2 text-slate-400 hover:bg-slate-50 transition-colors"
                >
                  <Camera className="w-8 h-8 text-slate-300" />
                  <span className="text-xs font-semibold text-slate-500">Belum ada foto</span>
                  <span className="text-[11px] text-slate-400">Ketuk untuk memfoto atau unggah gambar alat</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <div>
                <span className="text-slate-500 block">Kategori</span>
                <span className="font-bold text-slate-900">{selectedItem.category?.name}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Satuan Dasar</span>
                <span className="font-bold text-slate-900">{selectedItem.unit?.name}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Batas Minimum Stok</span>
                <span className="font-bold text-slate-900 num-mono">{selectedItem.min_stock} {selectedItem.unit?.name}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Status Operasional</span>
                <span className="font-bold text-slate-900">{selectedItem.is_active !== false ? "Aktif" : "Nonaktif"}</span>
              </div>
            </div>

            {/* Tombol Aksi Admin: Ubah Barang & Nonaktifkan/Aktifkan */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenEditModal}
                  className="flex-1 min-h-[48px] py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs touch-target transition-colors flex items-center justify-center gap-1.5"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>Ubah Data Barang</span>
                </button>

                {selectedItem.is_active !== false ? (
                  <button
                    type="button"
                    onClick={() => handleToggleItemStatus(selectedItem, false)}
                    className="min-h-[48px] px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 font-bold text-xs touch-target transition-colors flex items-center gap-1.5"
                    title="Nonaktifkan barang dari daftar pencatatan"
                  >
                    <Archive className="w-4 h-4 text-rose-700" />
                    <span>Nonaktifkan</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleToggleItemStatus(selectedItem, true)}
                    className="min-h-[48px] px-3.5 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold text-xs touch-target transition-colors flex items-center gap-1.5"
                    title="Aktifkan kembali barang ini"
                  >
                    <RotateCcw className="w-4 h-4 text-emerald-700" />
                    <span>Aktifkan</span>
                  </button>
                )}
              </div>

              {!itemTxInfo.loading && !itemTxInfo.hasTransactions && (
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => handleDeleteItem(selectedItem)}
                  className="w-full min-h-[44px] py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 hover:text-rose-800 font-bold text-xs touch-target transition-colors flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  <span>{isDeleting ? "Menghapus..." : "Hapus Barang Permanen"}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="w-full py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs touch-target transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL UBAH BARANG (EDIT) */}
      {isEditModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Ubah Master Barang</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Perbarui informasi barang {selectedItem.code}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg touch-target"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-900">
                {editError}
              </div>
            )}

            {/* Peringatan Nama Mirip Real-Time */}
            {similarItemsToEdit.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Perhatian: Ditemukan nama serupa</span>
                </div>
                <p className="text-amber-800 text-[11px]">
                  Barang yang mirip:{" "}
                  <strong>{similarItemsToEdit.map((s) => `${s.name} (${s.code})`).join(", ")}</strong>
                </p>
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
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full min-h-[48px] p-3 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none touch-target"
                />
              </div>

              {/* Kategori */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800">
                  Kategori <span className="text-rose-600">*</span>
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => handleEditCategoryChange(e.target.value)}
                  className="w-full min-h-[48px] p-3 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none touch-target"
                >
                  {allCategoryOptions.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Notifikasi Perpindahan Kategori & Penomoran Otomatis */}
              {editCategory !== selectedItem.category?.code && (
                <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-xs space-y-1 animate-in fade-in">
                  <div className="flex items-center gap-1.5 font-bold text-sky-900">
                    <Sparkles className="w-4 h-4 text-sky-600 shrink-0" />
                    <span>Perpindahan Kategori Terdeteksi</span>
                  </div>
                  <p className="text-sky-800 text-[11px] leading-relaxed">
                    Barang dipindahkan ke kategori{" "}
                    <strong>
                      {allCategoryOptions.find((c) => c.code === editCategory)?.name || editCategory}
                    </strong>
                    . Kode otomatis dialihkan ke <strong className="font-mono">{editCode}</strong>.
                    Saat disimpan, urutan nomor di kategori lama ({selectedItem.category?.code}) dan kategori baru akan <strong>otomatis disesuaikan kontinu</strong>.
                  </p>
                </div>
              )}

              {/* Kode Barang & Satuan Dasar */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">
                      Kode Barang <span className="text-rose-600">*</span>
                    </label>
                    <span className="text-[10px] text-emerald-700 font-bold">Bisa diedit</span>
                  </div>
                  <input
                    type="text"
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                    placeholder="Contoh: ATK-001"
                    className="w-full min-h-[48px] p-3 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm num-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none touch-target"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">Satuan Dasar</label>
                    {itemTxInfo.hasTransactions ? (
                      <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                        <Lock className="w-3 h-3" /> Dikunci
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-700 font-bold">Bisa diedit</span>
                    )}
                  </div>
                  {itemTxInfo.hasTransactions ? (
                    <input
                      type="text"
                      disabled
                      value={selectedItem.unit?.name || "-"}
                      className="w-full min-h-[48px] p-3 rounded-xl border border-slate-200 bg-slate-100 text-xs sm:text-sm font-medium text-slate-500 cursor-not-allowed touch-target"
                    />
                  ) : (
                    <select
                      value={editUnit}
                      onChange={(e) => setEditUnit(e.target.value)}
                      className="w-full min-h-[48px] p-3 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm font-medium touch-target focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    >
                      {unitOptions.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                      <option value="CUSTOM">+ Lainnya...</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Info Penguncian Satuan jika ada transaksi */}
              {itemTxInfo.hasTransactions && (
                <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                  🔒 Satuan dasar dikunci permanen karena barang sudah memiliki riwayat mutasi. Nomor kode tetap dapat Anda edit/koreksi kapan saja.
                </p>
              )}

              {editUnit === "CUSTOM" && !itemTxInfo.hasTransactions && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800">Nama Satuan Baru</label>
                  <input
                    type="text"
                    value={editCustomUnit}
                    onChange={(e) => setEditCustomUnit(e.target.value)}
                    placeholder="Misal: Paket, Pasang, Botol"
                    className="w-full min-h-[48px] p-3 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none touch-target"
                  />
                </div>
              )}

              {/* Batas Minimum Stok */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800">Batas Minimum Stok</label>
                <input
                  type="number"
                  min="0"
                  value={editMinStock}
                  onChange={(e) => setEditMinStock(e.target.value)}
                  className="w-full min-h-[48px] p-3 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none touch-target num-mono"
                />
              </div>

              {/* Lokasi Rak Penyimpanan */}
              {locations.length > 0 && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800">Lokasi Rak Penyimpanan</label>
                  <select
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="w-full min-h-[48px] p-3 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none touch-target"
                  >
                    <option value="">Pilih lokasi rak...</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Info Kuantitas Stok */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-600 text-xs flex items-start gap-2">
                <span className="text-sm">ℹ️</span>
                <p className="text-[11px] leading-relaxed text-slate-600">
                  <strong>Kuantitas Stok:</strong> Kuantitas barang tidak diedit di sini. Perubahan jumlah fisik wajib melalui transaksi mutasi (Masuk, Keluar, atau Penyesuaian/Opname) dengan mencantumkan alasan.
                </p>
              </div>
            </div>

            {/* Satu Tombol Simpan */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 min-h-[48px] py-3 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold text-xs touch-target hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSavingEdit || !editName.trim()}
                onClick={handleSaveEditItem}
                className={cn(
                  "flex-1 min-h-[48px] py-3 rounded-xl font-bold text-xs text-white shadow-xs touch-target transition-all flex items-center justify-center",
                  isSavingEdit || !editName.trim()
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-700"
                )}
              >
                {isSavingEdit ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </div>

            {/* Tombol Hapus Barang (Fitur Hapus pada Edit Barang) */}
            <div className="pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeleting || isSavingEdit}
                onClick={() => handleDeleteItem(selectedItem)}
                className={cn(
                  "w-full min-h-[44px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 touch-target",
                  itemTxInfo.hasTransactions
                    ? "bg-slate-50 text-slate-400 cursor-not-allowed border border-slate-200"
                    : "bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-200"
                )}
                title={
                  itemTxInfo.hasTransactions
                    ? `Barang ini memiliki ${itemTxInfo.count} catatan mutasi stok. Gunakan tombol Nonaktifkan.`
                    : "Hapus master barang ini secara permanen"
                }
              >
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>
                  {isDeleting
                    ? "Menghapus..."
                    : itemTxInfo.hasTransactions
                    ? `Hapus Permanen Dikunci (${itemTxInfo.count} Mutasi Stok)`
                    : "Hapus Barang Ini"}
                </span>
              </button>
              {itemTxInfo.hasTransactions && (
                <p className="text-[10px] text-slate-400 text-center mt-1">
                  Barang dengan riwayat mutasi stok dikunci dari penghapusan permanen. Silakan gunakan menu Nonaktifkan.
                </p>
              )}
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
                <h3 className="text-base font-bold text-slate-900">Tambah Barang Baru</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Daftarkan barang atau alat baru dengan kode otomatis
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setAddError("");
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg touch-target"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {addError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-900">
                {addError}
              </div>
            )}

            {/* Peringatan Nama Mirip Real-Time */}
            {similarItemsToAdd.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Perhatian: Ditemukan nama serupa</span>
                </div>
                <p className="text-amber-800 text-[11px]">
                  Barang yang mirip di sistem:{" "}
                  <strong>{similarItemsToAdd.map((s) => `${s.name} (${s.code})`).join(", ")}</strong>
                </p>
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
                  placeholder="Misal: Tripod Kamera, Handy Talkie, Baterai, dll."
                  className="w-full min-h-[48px] p-3 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none touch-target"
                />
              </div>

              {/* Kategori & Pratinjau Kode Otomatis */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-800">
                  Kategori <span className="text-rose-600">*</span>
                </label>
                <select
                  value={newItemCategory}
                  onChange={(e) => setNewItemCategory(e.target.value)}
                  className="w-full min-h-[48px] p-3 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none touch-target"
                >
                  {allCategoryOptions.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Kotak Info Kode Otomatis (Tidak Bisa Diketik Manual) */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Kode Otomatis:</span>
                <span className="font-mono font-bold text-emerald-800 text-sm">
                  {previewNewCode}
                </span>
              </div>

              {/* Satuan Dasar & Batas Minimum */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800">
                    Satuan Dasar <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={newItemUnit}
                    onChange={(e) => setNewItemUnit(e.target.value)}
                    className="w-full min-h-[48px] p-3 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none touch-target"
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
                  <label className="text-xs font-bold text-slate-800">Batas Minimum Stok</label>
                  <input
                    type="number"
                    min="0"
                    value={newItemMinStock}
                    onChange={(e) => setNewItemMinStock(e.target.value)}
                    className="w-full min-h-[48px] p-3 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none touch-target num-mono"
                  />
                </div>
              </div>

              {newItemUnit === "CUSTOM" && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800">Nama Satuan Baru</label>
                  <input
                    type="text"
                    value={customUnit}
                    onChange={(e) => setCustomUnit(e.target.value)}
                    placeholder="Misal: Paket, Pasang, Botol"
                    className="w-full min-h-[48px] p-3 rounded-xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none touch-target"
                  />
                </div>
              )}
            </div>

            {/* Satu Tombol Simpan */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setAddError("");
                }}
                className="flex-1 min-h-[48px] py-3 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold text-xs touch-target hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isAdding || !newItemName.trim()}
                onClick={handleSaveNewItem}
                className={cn(
                  "flex-1 min-h-[48px] py-3 rounded-xl font-bold text-xs text-white shadow-xs touch-target transition-all flex items-center justify-center",
                  isAdding || !newItemName.trim()
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800"
                )}
              >
                {isAdding ? "Menyimpan..." : "Simpan Barang Baru"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FOTO BARANG (hanya ADMIN) */}
      {selectedItem && (
        <PhotoCaptureModal
          isOpen={isPhotoModalOpen}
          onClose={() => setIsPhotoModalOpen(false)}
          title={`Foto: ${selectedItem.name}`}
          folder="items"
          entityId={selectedItem.id}
          onUploadSuccess={handleItemPhotoUploaded}
          cameraOnly={true}
        />
      )}

      {/* Lightbox Pratinjau Foto Penuh In-App */}
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
