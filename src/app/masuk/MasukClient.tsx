"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { Search, Plus, Minus, ArrowLeft, CheckCircle2, AlertTriangle, Building2, Receipt, DollarSign, PackageCheck, Layers, CloudOff } from "lucide-react";
import Link from "next/link";
import type { Item, Unit } from "@/types/inventory";
import type { UnitConversion } from "@/lib/services/inventory";
import { recordStockInAction } from "@/lib/actions/stock";
import { enqueueOutboxItem, setCachedMasterData, getCachedMasterData } from "@/lib/offline/db";
import { notifyOutboxChanged } from "@/lib/offline/sync";
import { cn } from "@/lib/utils";

interface MasukClientProps {
  items: Item[];
  units: Unit[];
  conversions: UnitConversion[];
}

export function MasukClient({ items: initialItems, units: initialUnits, conversions: initialConversions }: MasukClientProps) {
  const [isPending, startTransition] = useTransition();

  const [items, setItems] = useState<Item[]>(initialItems);
  const [units, setUnits] = useState<Unit[]>(initialUnits);
  const [conversions, setConversions] = useState<UnitConversion[]>(initialConversions);

  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [searchItem, setSearchItem] = useState<string>("");
  const [qtyBuy, setQtyBuy] = useState<number>(1);
  const [selectedBuyUnitId, setSelectedBuyUnitId] = useState<string>("");
  const [unitPrice, setUnitPrice] = useState<string>("");
  const [supplier, setSupplier] = useState<string>("");
  const [invoiceNo, setInvoiceNo] = useState<string>("");
  const [note, setNote] = useState<string>("");

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

  // Filter pencarian barang
  const filteredItems = searchItem.trim()
    ? items.filter(
        (i) =>
          i.name.toLowerCase().includes(searchItem.toLowerCase()) ||
          i.code.toLowerCase().includes(searchItem.toLowerCase())
      ).slice(0, 8)
    : items.slice(0, 6);

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
    const parsedPrice = unitPrice ? parseFloat(unitPrice.replace(/[^0-9]/g, "")) : undefined;

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
          totalPrice: parsedPrice ? parsedPrice * qtyBuy : undefined,
          isOffline: true,
        });
        setQtyBuy(1);
        setUnitPrice("");
        setSupplier("");
        setInvoiceNo("");
        setNote("");
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
          note: note.trim() || null,
        });

        if (res.success) {
          setSuccessData({
            itemName: selectedItem?.name || "",
            qtyBase,
            baseUnitName,
            qtyBuy,
            buyUnitName,
            totalPrice: parsedPrice ? parsedPrice * qtyBuy : undefined,
            isOffline: false,
          });
          // Reset form
          setQtyBuy(1);
          setUnitPrice("");
          setSupplier("");
          setInvoiceNo("");
          setNote("");
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
          totalPrice: parsedPrice ? parsedPrice * qtyBuy : undefined,
          isOffline: true,
        });
        setQtyBuy(1);
        setUnitPrice("");
        setSupplier("");
        setInvoiceNo("");
        setNote("");
      }
    });
  };

  if (successData) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-2xl p-6 border border-[var(--slate-200)] shadow-xs text-center space-y-4">
        <div
          className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto ${
            successData.isOffline
              ? "bg-amber-50 text-amber-600"
              : "bg-[var(--emerald-50)] text-[var(--emerald-600)]"
          }`}
        >
          {successData.isOffline ? <CloudOff className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8" />}
        </div>
        <h2 className="text-xl font-bold text-[var(--slate-900)]">
          {successData.isOffline ? "Disimpan di Antrean Offline HP!" : "Penerimaan Barang Berhasil!"}
        </h2>
        <div className="bg-[var(--bg-canvas)] p-3.5 rounded-xl border border-[var(--slate-200)] text-sm space-y-1">
          <div className="font-bold text-[var(--slate-900)]">{successData.itemName}</div>
          <div className="text-[var(--emerald-700)] font-bold text-base num-mono">
            + {successData.qtyBase} {successData.baseUnitName}
          </div>
          {successData.buyUnitName !== successData.baseUnitName && (
            <div className="text-xs text-[var(--slate-400)]">
              (Dikonversi dari {successData.qtyBuy} {successData.buyUnitName})
            </div>
          )}
          {successData.totalPrice && (
            <div className="text-xs text-[var(--slate-700)] pt-1 border-t border-slate-200">
              Total Pembelian: Rp {successData.totalPrice.toLocaleString("id-ID")}
            </div>
          )}
        </div>
        <p className="text-xs text-[var(--slate-400)] leading-relaxed">
          {successData.isOffline
            ? "Tercatat di antrean IndexedDB offline dengan UUID v4 idempoten. Akan tersinkronisasi otomatis begitu perangkat mendeteksi koneksi."
            : "Tercatat di ledger append-only stock_movements & riwayat harga otomatis diperbarui."}
        </p>


        <div className="pt-2 flex flex-col gap-2">
          <button
            onClick={() => {
              setSuccessData(null);
              setSelectedItemId("");
              setSearchItem("");
            }}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[var(--emerald-600)] to-[var(--emerald-700)] text-white font-semibold text-sm shadow-xs touch-target"
          >
            Catat Barang Masuk Lainnya
          </button>
          <Link
            href="/riwayat"
            className="w-full py-3 rounded-xl bg-white border border-[var(--slate-200)] text-[var(--slate-700)] font-semibold text-sm hover:bg-slate-50 touch-target block text-center"
          >
            Lihat Riwayat Pergerakan
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
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--slate-700)] hover:text-[var(--emerald-700)] touch-target"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Beranda</span>
        </Link>
        <span className="text-xs font-bold text-[var(--slate-400)] num-mono">CATAT MASUK</span>
      </div>

      <div className="bg-white rounded-2xl p-5 border border-[var(--slate-200)] shadow-xs space-y-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--slate-900)] tracking-tight">
            Catat Penerimaan Barang (Masuk)
          </h1>
          <p className="text-xs text-[var(--slate-400)] mt-0.5">
            Pencatatan pembelian atau restock barang baru dengan konversi satuan kemasan otomatis.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-[var(--rose-50)] border border-[var(--rose-500)]/20 text-xs font-semibold text-[var(--rose-700)] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1. Pilih Barang */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[var(--slate-700)] flex items-center gap-1.5">
            <PackageCheck className="w-3.5 h-3.5 text-[var(--emerald-600)]" />
            <span>1. Pilih Barang yang Masuk</span>
          </label>

          {!selectedItem ? (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--slate-400)]" />
                <input
                  type="text"
                  value={searchItem}
                  onChange={(e) => setSearchItem(e.target.value)}
                  placeholder="Ketik nama atau kode barang (mis. Siera, Kertas, ATK-005)..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-[var(--slate-200)] bg-[var(--bg-canvas)] text-xs sm:text-sm text-[var(--slate-900)] focus:ring-2 focus:ring-[var(--emerald-600)] focus:outline-none touch-target"
                />
              </div>

              <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pt-1">
                {filteredItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedItemId(item.id);
                      setSelectedBuyUnitId(item.base_unit_id);
                      setSearchItem("");
                    }}
                    className="p-2.5 rounded-xl border border-slate-100 hover:border-[var(--emerald-500)]/40 hover:bg-[var(--emerald-50)]/40 text-left transition-colors flex items-center justify-between touch-target"
                  >
                    <div>
                      <div className="text-xs font-bold text-[var(--slate-900)]">{item.name}</div>
                      <div className="text-[11px] text-[var(--slate-400)]">
                        {item.category?.name} &bull; Satuan: {item.unit?.name}
                      </div>
                    </div>
                    <span className="num-mono font-bold text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {item.code}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--emerald-500)]/30 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="num-mono font-bold text-xs px-2 py-0.5 rounded bg-[var(--emerald-50)] text-[var(--emerald-700)]">
                    {selectedItem.code}
                  </span>
                  <span className="text-xs text-[var(--slate-400)]">{selectedItem.category?.name}</span>
                </div>
                <div className="text-sm font-bold text-[var(--slate-900)] mt-1">{selectedItem.name}</div>
                <div className="text-xs text-[var(--slate-400)] mt-0.5">
                  Satuan dasar gudang: <strong className="text-[var(--slate-700)]">{selectedItem.unit?.name}</strong>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItemId("")}
                className="px-2.5 py-1.5 rounded-lg border border-[var(--slate-200)] text-xs text-[var(--slate-700)] hover:bg-slate-100 touch-target shrink-0"
              >
                Ganti
              </button>
            </div>
          )}
        </div>

        {/* 2. Jumlah & Konversi Satuan */}
        {selectedItem && (
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-[var(--slate-700)] block mb-1">
                  Jumlah Pembelian
                </label>
                <div className="flex items-center bg-[var(--bg-canvas)] rounded-xl border border-[var(--slate-200)] p-1">
                  <button
                    type="button"
                    onClick={() => setQtyBuy((prev) => Math.max(1, prev - 1))}
                    className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 touch-target font-bold"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={qtyBuy}
                    onChange={(e) => setQtyBuy(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 text-center font-bold text-lg text-[var(--slate-900)] bg-transparent focus:outline-none num-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setQtyBuy((prev) => prev + 1)}
                    className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 touch-target font-bold"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[var(--slate-700)] block mb-1">
                  Satuan Beli / Kemasan
                </label>
                <select
                  value={activeBuyUnitId}
                  onChange={(e) => setSelectedBuyUnitId(e.target.value)}
                  className="w-full py-3 px-3 rounded-xl border border-[var(--slate-200)] bg-[var(--bg-canvas)] text-xs sm:text-sm text-[var(--slate-900)] focus:ring-2 focus:ring-[var(--emerald-600)] focus:outline-none touch-target"
                >
                  <option value={selectedItem.base_unit_id}>
                    {selectedItem.unit?.name} (Satuan Dasar)
                  </option>
                  {availableConversions.map((conv) => (
                    <option key={conv.id} value={conv.from_unit_id}>
                      {conv.from_unit?.name} (1 {conv.from_unit?.name} = {conv.factor} {selectedItem.unit?.name})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Banner Konversi Satuan Realtime */}
            {conversionFactor > 1 && (
              <div className="p-3 rounded-xl bg-[var(--emerald-50)] border border-[var(--emerald-500)]/20 text-xs text-[var(--emerald-700)] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[var(--emerald-600)]" />
                  <span>Kalkulasi Otomatis ke Satuan Dasar:</span>
                </span>
                <strong className="num-mono text-sm font-bold">
                  {qtyBuy} {buyUnitName} = {qtyBase} {baseUnitName}
                </strong>
              </div>
            )}
          </div>
        )}

        {/* 3. Detail Pembelian & Harga */}
        {selectedItem && (
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--slate-700)] flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-[var(--emerald-600)]" />
                  <span>Harga per {buyUnitName} (Opsional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--slate-400)]">
                    Rp
                  </span>
                  <input
                    type="text"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    placeholder="Contoh: 45.000"
                    className="w-full pl-9 pr-3.5 py-3 rounded-xl border border-[var(--slate-200)] bg-[var(--bg-canvas)] text-xs sm:text-sm text-[var(--slate-900)] focus:ring-2 focus:ring-[var(--emerald-600)] focus:outline-none touch-target num-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--slate-700)] flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[var(--emerald-600)]" />
                  <span>Supplier / Toko Pembelian</span>
                </label>
                <input
                  type="text"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder="Nama toko / vendor"
                  className="w-full py-3 px-3.5 rounded-xl border border-[var(--slate-200)] bg-[var(--bg-canvas)] text-xs sm:text-sm text-[var(--slate-900)] focus:ring-2 focus:ring-[var(--emerald-600)] focus:outline-none touch-target"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--slate-700)] flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-[var(--emerald-600)]" />
                  <span>No. Nota / Faktur (Opsional)</span>
                </label>
                <input
                  type="text"
                  value={invoiceNo}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                  placeholder="Misal: INV-2026-001"
                  className="w-full py-3 px-3.5 rounded-xl border border-[var(--slate-200)] bg-[var(--bg-canvas)] text-xs sm:text-sm text-[var(--slate-900)] focus:ring-2 focus:ring-[var(--emerald-600)] focus:outline-none touch-target"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--slate-700)]">
                  Catatan Tambahan
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Keterangan pembelian..."
                  className="w-full py-3 px-3.5 rounded-xl border border-[var(--slate-200)] bg-[var(--bg-canvas)] text-xs sm:text-sm text-[var(--slate-900)] focus:ring-2 focus:ring-[var(--emerald-600)] focus:outline-none touch-target"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tombol Simpan Penerimaan */}
        <button
          type="button"
          disabled={isPending || !selectedItemId}
          onClick={handleSubmit}
          className={cn(
            "w-full py-3.5 rounded-xl font-semibold text-sm shadow-sm touch-target transition-all mt-4",
            isPending || !selectedItemId
              ? "bg-slate-200 text-slate-400 cursor-not-allowed"
              : "bg-gradient-to-r from-[var(--emerald-600)] to-[var(--emerald-700)] text-white hover:from-[var(--emerald-700)] hover:to-[var(--emerald-700)] active:scale-98"
          )}
        >
          {isPending ? "Menyimpan ke Ledger..." : `Simpan Penerimaan (+${qtyBase} ${baseUnitName})`}
        </button>
      </div>
    </div>
  );
}
