"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import {
  Search,
  Plus,
  Minus,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Receipt,
  DollarSign,
  PackageCheck,
  Layers,
  CloudOff,
  Camera,
  X,
  Package,
  Calculator,
} from "lucide-react";
import Link from "next/link";
import type { Item, Unit } from "@/types/inventory";
import type { UnitConversion } from "@/lib/services/inventory";
import { recordStockInAction } from "@/lib/actions/stock";
import { enqueueOutboxItem, setCachedMasterData, getCachedMasterData } from "@/lib/offline/db";
import { notifyOutboxChanged } from "@/lib/offline/sync";
import { PhotoCaptureModal } from "@/components/camera/PhotoCaptureModal";
import { PhotoThumbnail } from "@/components/camera/PhotoThumbnail";
import { ImageLightboxModal } from "@/components/camera/ImageLightboxModal";
import { getItemPhotoPublicUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

interface MasukClientProps {
  items: Item[];
  units: Unit[];
  conversions: UnitConversion[];
}

export function MasukClient({
  items: initialItems,
  units: initialUnits,
  conversions: initialConversions,
}: MasukClientProps) {
  const [isPending, startTransition] = useTransition();

  const [items, setItems] = useState<Item[]>(initialItems);
  const [units, setUnits] = useState<Unit[]>(initialUnits);
  const [conversions, setConversions] = useState<UnitConversion[]>(initialConversions);

  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchItem, setSearchItem] = useState<string>("");
  const [qtyBuy, setQtyBuy] = useState<number>(1);
  const [selectedBuyUnitId, setSelectedBuyUnitId] = useState<string>("");
  const [unitPrice, setUnitPrice] = useState<string>("");
  const [supplier, setSupplier] = useState<string>("");
  const [invoiceNo, setInvoiceNo] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [receiptPhotoPath, setReceiptPhotoPath] = useState<string>("");
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState<boolean>(false);

  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxTitle, setLightboxTitle] = useState<string>("");

  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successData, setSuccessData] = useState<{
    itemName: string;
    qtyBase: number;
    baseUnitName: string;
    qtyBuy: number;
    buyUnitName: string;
    totalPrice?: number;
    isOffline?: boolean;
  } | null>(null);

  // Cache master data ke IndexedDB saat online
  useEffect(() => {
    async function syncCache() {
      if (initialItems.length > 0) {
        await setCachedMasterData("items", initialItems);
        await setCachedMasterData("units", initialUnits);
        await setCachedMasterData("conversions", initialConversions);
      } else {
        const cachedItems = await getCachedMasterData<Item[]>("items");
        const cachedUnits = await getCachedMasterData<Unit[]>("units");
        const cachedConversions = await getCachedMasterData<UnitConversion[]>("conversions");
        if (cachedItems) setItems(cachedItems);
        if (cachedUnits) setUnits(cachedUnits);
        if (cachedConversions) setConversions(cachedConversions);
      }
    }
    syncCache();
  }, [initialItems, initialUnits, initialConversions]);

  const selectedItem = items.find((i) => i.id === selectedItemId);

  // Daftar kategori unik untuk pill filter
  const categories = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((it) => {
      if (it.category?.code) {
        map.set(it.category.code, it.category.name);
      }
    });
    return Array.from(map.entries()).map(([code, name]) => ({ code, name }));
  }, [items]);

  // Cari konversi satuan yang tersedia untuk barang yang dipilih
  const availableConversions = useMemo(() => {
    if (!selectedItemId) return [];
    return conversions.filter((c) => c.item_id === selectedItemId);
  }, [selectedItemId, conversions]);

  // Satuan beli default ke satuan dasar jika belum dipilih
  const activeBuyUnitId = selectedBuyUnitId || selectedItem?.base_unit_id || "";

  // Cari faktor konversi
  const conversionFactor = useMemo(() => {
    if (!selectedItem) return 1;
    if (activeBuyUnitId === selectedItem.base_unit_id) return 1;
    const match = availableConversions.find((c) => c.from_unit_id === activeBuyUnitId);
    return match ? Number(match.factor) : 1;
  }, [selectedItem, activeBuyUnitId, availableConversions]);

  // Kuantitas dasar terhitung
  const qtyBase = qtyBuy * conversionFactor;

  // Nama satuan beli
  const buyUnitName =
    units.find((u) => u.id === activeBuyUnitId)?.name || selectedItem?.unit?.name || "Unit";
  const baseUnitName = selectedItem?.unit?.name || "Unit";

  // Filter pencarian barang dan kategori
  const filteredItems = useMemo(() => {
    let list = items.filter((i) => i.is_active !== false);

    if (selectedCategory !== "ALL") {
      list = list.filter((i) => i.category?.code === selectedCategory);
    }

    if (searchItem.trim()) {
      const q = searchItem.trim().toLowerCase();
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.code.toLowerCase().includes(q) ||
          (i.legacy_code && i.legacy_code.toLowerCase().includes(q))
      );
    }

    return list.slice(0, 20);
  }, [items, selectedCategory, searchItem]);

  // Format harga & kalkulasi total realtime
  const numericPrice = useMemo(() => {
    if (!unitPrice) return 0;
    const clean = unitPrice.replace(/[^0-9]/g, "");
    return clean ? parseInt(clean, 10) : 0;
  }, [unitPrice]);

  const formattedPriceInput = (val: string) => {
    const raw = val.replace(/[^0-9]/g, "");
    if (!raw) return "";
    return parseInt(raw, 10).toLocaleString("id-ID");
  };

  const calculatedTotalPrice = numericPrice > 0 ? numericPrice * qtyBuy : 0;

  // Quick vendor suggestions
  const vendorSuggestions = [
    "Gramedia",
    "Toko Berkah ATK",
    "Supplier Safety K3",
    "PT Kawan Lama",
    "Toko Listrik & Bangunan",
    "Marketplace Online",
  ];

  const handleSubmit = () => {
    if (!selectedItemId) {
      setErrorMsg("Pilih barang yang masuk terlebih dahulu.");
      return;
    }
    if (qtyBuy <= 0 || qtyBase <= 0) {
      setErrorMsg("Jumlah pembelian/masuk harus lebih besar dari 0.");
      return;
    }

    setErrorMsg("");
    const clientUuid = crypto.randomUUID();
    const parsedPrice = numericPrice > 0 ? numericPrice : undefined;

    // Mode Offline Langsung jika tidak ada jaringan
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      enqueueOutboxItem(
        "STOCK_IN",
        {
          itemId: selectedItemId,
          qtyBuy,
          buyUnitId: activeBuyUnitId,
          qtyBase,
          unitPrice: parsedPrice,
          supplier: supplier.trim() || null,
          invoiceNo: invoiceNo.trim() || null,
          receiptPath: receiptPhotoPath || null,
          note: note.trim() || null,
        },
        clientUuid
      ).then(() => {
        notifyOutboxChanged();
        setSuccessData({
          itemName: selectedItem?.name || "",
          qtyBase,
          baseUnitName,
          qtyBuy,
          buyUnitName,
          totalPrice: calculatedTotalPrice > 0 ? calculatedTotalPrice : undefined,
          isOffline: true,
        });
        setQtyBuy(1);
        setUnitPrice("");
        setSupplier("");
        setInvoiceNo("");
        setNote("");
        setReceiptPhotoPath("");
      });
      return;
    }

    startTransition(async () => {
      try {
        const res = await recordStockInAction({
          clientUuid,
          itemId: selectedItemId,
          qtyBuy,
          buyUnitId: activeBuyUnitId,
          qtyBase,
          unitPrice: parsedPrice,
          supplier: supplier.trim() || null,
          invoiceNo: invoiceNo.trim() || null,
          receiptPath: receiptPhotoPath || null,
          note: note.trim() || null,
        });

        if (res.success) {
          setSuccessData({
            itemName: selectedItem?.name || "",
            qtyBase,
            baseUnitName,
            qtyBuy,
            buyUnitName,
            totalPrice: calculatedTotalPrice > 0 ? calculatedTotalPrice : undefined,
            isOffline: false,
          });
          setQtyBuy(1);
          setUnitPrice("");
          setSupplier("");
          setInvoiceNo("");
          setNote("");
          setReceiptPhotoPath("");
        } else {
          setErrorMsg(res.error || "Gagal mencatat penerimaan barang.");
        }
      } catch (networkErr) {
        console.warn("Koneksi gagal, menyimpan ke antrean offline:", networkErr);
        await enqueueOutboxItem(
          "STOCK_IN",
          {
            itemId: selectedItemId,
            qtyBuy,
            buyUnitId: activeBuyUnitId,
            qtyBase,
            unitPrice: parsedPrice,
            supplier: supplier.trim() || null,
            invoiceNo: invoiceNo.trim() || null,
            receiptPath: receiptPhotoPath || null,
            note: note.trim() || null,
          },
          clientUuid
        );
        notifyOutboxChanged();
        setSuccessData({
          itemName: selectedItem?.name || "",
          qtyBase,
          baseUnitName,
          qtyBuy,
          buyUnitName,
          totalPrice: calculatedTotalPrice > 0 ? calculatedTotalPrice : undefined,
          isOffline: true,
        });
        setQtyBuy(1);
        setUnitPrice("");
        setSupplier("");
        setInvoiceNo("");
        setNote("");
        setReceiptPhotoPath("");
      }
    });
  };

  if (successData) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-3xl p-6 border border-slate-200 shadow-sm text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <div
          className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-xs ${
            successData.isOffline
              ? "bg-amber-50 text-amber-600 border border-amber-200"
              : "bg-emerald-50 text-emerald-600 border border-emerald-200"
          }`}
        >
          {successData.isOffline ? <CloudOff className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8 stroke-[2.3]" />}
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            {successData.isOffline ? "Tersimpan di Antrean Offline HP" : "Penerimaan Barang Berhasil!"}
          </h2>
          <div className="mt-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-sm space-y-1">
            <div className="font-bold text-slate-900">{successData.itemName}</div>
            <div className="text-emerald-700 font-extrabold text-lg num-mono">
              + {successData.qtyBase} {successData.baseUnitName}
            </div>
            {successData.buyUnitName !== successData.baseUnitName && (
              <div className="text-xs text-slate-500">
                (Dikonversi otomatis dari {successData.qtyBuy} {successData.buyUnitName})
              </div>
            )}
            {successData.totalPrice && (
              <div className="text-xs font-bold text-slate-700 pt-1.5 border-t border-slate-200/80 num-mono">
                Total Belanja: Rp {successData.totalPrice.toLocaleString("id-ID")}
              </div>
            )}
          </div>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          {successData.isOffline
            ? "Data pembelian tersimpan di memori HP. Otomatis disinkronkan ke server saat terhubung kembali ke internet."
            : "Saldo fisik dan buku besar gudang telah bertambah sesuai konversi satuan dasar."}
        </p>

        <div className="pt-2 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => {
              setSuccessData(null);
              setSelectedItemId("");
              setSearchItem("");
            }}
            className="w-full min-h-[52px] py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold text-sm shadow-xs touch-target transition-all active:scale-98"
          >
            Catat Barang Masuk Lainnya
          </button>
          <Link
            href="/riwayat"
            className="w-full min-h-[48px] py-3 rounded-2xl bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 touch-target block text-center transition-colors"
          >
            Lihat Riwayat Pergerakan Stok
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-24 md:pb-12">
      {/* Top Bar Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-emerald-700 touch-target transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Beranda</span>
        </Link>
        <span className="text-[11px] font-bold text-slate-400 num-mono tracking-wider bg-slate-100 px-2 py-0.5 rounded-md">
          FORM PENERIMAAN
        </span>
      </div>

      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Catat Penerimaan Barang (Masuk)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Pencatatan restock, pembelian baru, dan konversi satuan kemasan otomatis.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-900 flex items-center gap-2.5 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1. PILIH BARANG */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-900 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <PackageCheck className="w-4 h-4 text-emerald-600" />
              <span>1. Pilih Barang yang Masuk</span>
            </span>
            {selectedItem && (
              <button
                type="button"
                onClick={() => setSelectedItemId("")}
                className="text-emerald-700 hover:underline text-[11px] font-semibold"
              >
                Ganti Barang
              </button>
            )}
          </label>

          {!selectedItem ? (
            <div className="space-y-2.5">
              {/* Category Filter Horizontal Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
                <button
                  type="button"
                  onClick={() => setSelectedCategory("ALL")}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all touch-target shrink-0",
                    selectedCategory === "ALL"
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  Semua ({items.filter((i) => i.is_active !== false).length})
                </button>
                {categories.map((c) => {
                  const count = items.filter((i) => i.category?.code === c.code && i.is_active !== false).length;
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => setSelectedCategory(c.code)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all touch-target shrink-0 flex items-center gap-1",
                        selectedCategory === c.code
                          ? "bg-emerald-700 text-white shadow-2xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      )}
                    >
                      <span>{c.code}</span>
                      <span className="text-[10px] opacity-75">({count})</span>
                    </button>
                  );
                })}
              </div>

              {/* Search input with Clear button */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchItem}
                  onChange={(e) => setSearchItem(e.target.value)}
                  placeholder="Ketik nama atau kode barang..."
                  className="w-full pl-10 pr-9 py-3 rounded-2xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none touch-target"
                />
                {searchItem && (
                  <button
                    type="button"
                    onClick={() => setSearchItem("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 touch-target"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Suggestions List */}
              <div className="grid grid-cols-1 gap-1.5 max-h-56 overflow-y-auto pr-0.5">
                {filteredItems.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-100">
                    Tidak ada barang yang cocok dalam kategori ini.
                  </div>
                ) : (
                  filteredItems.map((item) => {
                    const photoUrl = getItemPhotoPublicUrl(item.photo_path);

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setSelectedItemId(item.id);
                          setSelectedBuyUnitId(item.base_unit_id);
                          setSearchItem("");
                        }}
                        className="p-2.5 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 text-left transition-colors flex items-center justify-between gap-2.5 touch-target active:bg-emerald-100/50"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {photoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={photoUrl}
                              alt={item.name}
                              className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center shrink-0 border border-slate-200">
                              <Package className="w-4 h-4" />
                            </div>
                          )}
                          <div className="truncate">
                            <div className="text-xs font-bold text-slate-900 truncate">{item.name}</div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-emerald-800 font-bold">{item.code}</span>
                              <span>&bull;</span>
                              <span>Satuan: {item.unit?.name}</span>
                            </div>
                          </div>
                        </div>

                        <span className="num-mono font-bold text-[11px] px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 shrink-0">
                          {item.category?.code}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            /* Card Barang Terpilih */
            <div className="p-4 rounded-2xl bg-emerald-50/50 border-2 border-emerald-500/40 flex items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-3 min-w-0">
                {selectedItem.photo_path ? (
                  <button
                    type="button"
                    onClick={() => {
                      const url = getItemPhotoPublicUrl(selectedItem.photo_path);
                      if (url) {
                        setLightboxUrl(url);
                        setLightboxTitle(selectedItem.name);
                      }
                    }}
                    className="relative w-12 h-12 rounded-xl overflow-hidden border border-emerald-200 shrink-0 group shadow-2xs"
                    title="Perbesar Foto"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getItemPhotoPublicUrl(selectedItem.photo_path)!}
                      alt={selectedItem.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </button>
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-white text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0 shadow-2xs">
                    <PackageCheck className="w-6 h-6 stroke-[2.2]" />
                  </div>
                )}

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="num-mono font-bold text-xs px-2 py-0.5 rounded-md bg-white text-emerald-800 border border-emerald-200">
                      {selectedItem.code}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      {selectedItem.category?.name}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 mt-1 truncate">
                    {selectedItem.name}
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    Satuan dasar gudang:{" "}
                    <strong className="text-emerald-800 font-bold">{selectedItem.unit?.name}</strong>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedItemId("")}
                className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 touch-target shrink-0 shadow-2xs"
              >
                Ganti
              </button>
            </div>
          )}
        </div>

        {/* 2. JUMLAH & KONVERSI SATUAN */}
        {selectedItem && (
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-900 block mb-1">
                  Jumlah Pembelian
                </label>
                <div className="flex items-center bg-slate-50 rounded-2xl border border-slate-200 p-1">
                  <button
                    type="button"
                    onClick={() => setQtyBuy((prev) => Math.max(1, prev - 1))}
                    className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-800 touch-target active:scale-95 shadow-2xs"
                    aria-label="Kurangi 1"
                  >
                    <Minus className="w-5 h-5 stroke-[2.5]" />
                  </button>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="1"
                    value={qtyBuy}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setQtyBuy(isNaN(val) ? 1 : Math.max(1, val));
                    }}
                    className="flex-1 text-center font-extrabold text-2xl text-slate-900 bg-transparent focus:outline-none num-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setQtyBuy((prev) => prev + 1)}
                    className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-800 touch-target active:scale-95 shadow-2xs"
                    aria-label="Tambah 1"
                  >
                    <Plus className="w-5 h-5 stroke-[2.5]" />
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-900 block mb-1">
                  Satuan Beli / Kemasan
                </label>
                <select
                  value={activeBuyUnitId}
                  onChange={(e) => setSelectedBuyUnitId(e.target.value)}
                  className="w-full min-h-[50px] py-3 px-3 rounded-2xl border border-slate-300 bg-white text-xs sm:text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none touch-target"
                >
                  <option value={selectedItem.base_unit_id}>
                    {selectedItem.unit?.name} (Satuan Dasar Gudang)
                  </option>
                  {availableConversions.map((conv) => (
                    <option key={conv.id} value={conv.from_unit_id}>
                      {conv.from_unit?.name} (1 {conv.from_unit?.name} = {conv.factor} {selectedItem.unit?.name})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Chips Tambah Kuantitas */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1 no-scrollbar">
              {[1, 5, 10, 25, 50, 100].map((inc) => (
                <button
                  key={inc}
                  type="button"
                  onClick={() => setQtyBuy((prev) => prev + inc)}
                  className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 text-xs font-bold text-slate-700 touch-target active:scale-95 transition-all shadow-2xs"
                >
                  +{inc}
                </button>
              ))}
            </div>

            {/* Banner Konversi Satuan Realtime */}
            {conversionFactor > 1 && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-900 flex items-center justify-between animate-in fade-in">
                <span className="flex items-center gap-1.5 font-semibold">
                  <Layers className="w-4 h-4 text-emerald-700" />
                  <span>Kalkulasi Satuan Dasar:</span>
                </span>
                <strong className="num-mono text-sm font-extrabold text-emerald-800">
                  {qtyBuy} {buyUnitName} = {qtyBase} {baseUnitName}
                </strong>
              </div>
            )}
          </div>
        )}

        {/* 3. DETAIL HARGA & PEMBELIAN */}
        {selectedItem && (
          <div className="space-y-3.5 pt-2 border-t border-slate-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Harga per Satuan */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span>Harga per {buyUnitName} (Opsional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    Rp
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(formattedPriceInput(e.target.value))}
                    placeholder="Contoh: 45.000"
                    className="w-full min-h-[48px] pl-10 pr-3.5 py-3 rounded-2xl border border-slate-300 bg-white text-xs sm:text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none touch-target num-mono"
                  />
                </div>
              </div>

              {/* Supplier / Toko */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  <span>Supplier / Toko Pembelian</span>
                </label>
                <input
                  type="text"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder="Nama toko / vendor"
                  className="w-full min-h-[48px] py-3 px-3.5 rounded-2xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none touch-target"
                />
              </div>
            </div>

            {/* Quick Vendor Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {vendorSuggestions.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setSupplier(v)}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-[11px] font-semibold text-slate-600 border border-slate-200 transition-colors touch-target whitespace-nowrap"
                >
                  {v}
                </button>
              ))}
            </div>

            {/* Kalkulasi Otomatis Total Belanja */}
            {calculatedTotalPrice > 0 && (
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between text-slate-700 animate-in fade-in">
                <span className="flex items-center gap-1.5 font-semibold">
                  <Calculator className="w-4 h-4 text-emerald-600" />
                  <span>Estimasi Total Pembelian:</span>
                </span>
                <span className="num-mono font-extrabold text-sm text-slate-900">
                  Rp {calculatedTotalPrice.toLocaleString("id-ID")}
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* No Faktur / Nota */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  <span>No. Nota / Faktur (Opsional)</span>
                </label>
                <input
                  type="text"
                  value={invoiceNo}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                  placeholder="Misal: INV-2026-001"
                  className="w-full min-h-[48px] py-3 px-3.5 rounded-2xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none touch-target font-mono"
                />
              </div>

              {/* Catatan Pembelian */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-900">
                  Catatan Tambahan
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Keterangan pembelian..."
                  className="w-full min-h-[48px] py-3 px-3.5 rounded-2xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none touch-target"
                />
              </div>
            </div>

            {/* Foto Nota Pembelian */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <label className="text-xs font-bold text-slate-900 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-emerald-600" />
                  <span>Foto Nota / Kuitansi Pembelian (Opsional)</span>
                </span>
                {receiptPhotoPath && (
                  <button
                    type="button"
                    onClick={() => setReceiptPhotoPath("")}
                    className="text-[11px] text-rose-600 hover:underline font-semibold"
                  >
                    Hapus Foto Nota
                  </button>
                )}
              </label>

              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <PhotoThumbnail
                  photoPath={receiptPhotoPath}
                  altText="Nota Pembelian"
                  onOpenUpload={() => setIsPhotoModalOpen(true)}
                />
                <div className="text-xs text-slate-500">
                  {receiptPhotoPath ? (
                    <span className="font-semibold text-emerald-700">Nota fisik tersimpan & terlampir</span>
                  ) : (
                    <span>Ambil foto kuitansi/struk fisik untuk verifikasi pembukuan</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tombol Simpan Penerimaan (Tinggi Minimal 56px) */}
        <button
          type="button"
          disabled={isPending || !selectedItemId}
          onClick={handleSubmit}
          className={cn(
            "w-full min-h-[56px] py-4 rounded-2xl font-bold text-sm sm:text-base shadow-sm touch-target transition-all mt-4",
            isPending || !selectedItemId
              ? "bg-slate-200 text-slate-400 cursor-not-allowed"
              : "bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white active:scale-98 shadow-emerald-700/20"
          )}
        >
          {isPending
            ? "Mencatat Penerimaan..."
            : selectedItem
            ? `Simpan Penerimaan (+${qtyBase} ${baseUnitName})`
            : "Pilih Barang Terlebih Dahulu"}
        </button>
      </div>

      {/* Modal Ambil & Unggah Foto Nota */}
      <PhotoCaptureModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        title="Foto Nota / Kuitansi"
        folder="receipts"
        entityId={`nota-${Date.now()}`}
        onUploadSuccess={(photoPath) => setReceiptPhotoPath(photoPath)}
      />

      {/* Lightbox Pratinjau Foto */}
      {lightboxUrl && (
        <ImageLightboxModal
          isOpen={true}
          onClose={() => setLightboxUrl(null)}
          imageUrl={lightboxUrl}
          title={`Foto: ${lightboxTitle}`}
          altText={lightboxTitle}
        />
      )}
    </div>
  );
}
