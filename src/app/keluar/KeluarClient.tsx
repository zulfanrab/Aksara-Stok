"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Minus,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  User,
  Briefcase,
  FileText,
  Package,
  CloudOff,
  X,
  Camera,
  Layers,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import type { Item, Person, Project } from "@/types/inventory";
import { recordStockOutAction } from "@/lib/actions/stock";
import { enqueueOutboxItem, setCachedMasterData, getCachedMasterData } from "@/lib/offline/db";
import { notifyOutboxChanged } from "@/lib/offline/sync";
import { getItemPhotoPublicUrl } from "@/lib/storage";
import { ImageLightboxModal } from "@/components/camera/ImageLightboxModal";
import { cn } from "@/lib/utils";

interface KeluarClientProps {
  items: Item[];
  people: Person[];
  projects: Project[];
  stockMap: Record<string, number>;
}

export function KeluarClient({
  items: initialItems,
  people: initialPeople,
  projects: initialProjects,
  stockMap: initialStockMap,
}: KeluarClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [items, setItems] = useState<Item[]>(initialItems);
  const [people, setPeople] = useState<Person[]>(initialPeople);
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [stockMap, setStockMap] = useState<Record<string, number>>(initialStockMap);

  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchItem, setSearchItem] = useState<string>("");
  const [qty, setQty] = useState<number>(1);
  const [selectedPersonId, setSelectedPersonId] = useState<string>(initialPeople[0]?.id || "");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [note, setNote] = useState<string>("");

  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxTitle, setLightboxTitle] = useState<string>("");

  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successData, setSuccessData] = useState<{
    itemName: string;
    qty: number;
    unitName: string;
    isOffline?: boolean;
  } | null>(null);

  // Cache master data ke IndexedDB saat online & hydrate jika offline
  useEffect(() => {
    async function syncCache() {
      if (initialItems.length > 0) {
        await setCachedMasterData("items", initialItems);
        await setCachedMasterData("people", initialPeople);
        await setCachedMasterData("projects", initialProjects);
        await setCachedMasterData("stockMap", initialStockMap);
      } else {
        const cachedItems = await getCachedMasterData<Item[]>("items");
        const cachedPeople = await getCachedMasterData<Person[]>("people");
        const cachedProjects = await getCachedMasterData<Project[]>("projects");
        const cachedStockMap = await getCachedMasterData<Record<string, number>>("stockMap");
        if (cachedItems) setItems(cachedItems);
        if (cachedPeople) {
          setPeople(cachedPeople);
          if (!selectedPersonId && cachedPeople[0]) setSelectedPersonId(cachedPeople[0].id);
        }
        if (cachedProjects) setProjects(cachedProjects);
        if (cachedStockMap) setStockMap(cachedStockMap);
      }
    }
    syncCache();
  }, [initialItems, initialPeople, initialProjects, initialStockMap]);

  // Selected item object
  const selectedItem = items.find((i) => i.id === selectedItemId);
  const currentStock = selectedItem ? stockMap[selectedItem.id] || 0 : 0;

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

  // Filter items untuk pencarian dan kategori
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

  // Quick note suggestions
  const quickNotes = [
    "Riksa Uji Lapangan",
    "Operasional Kantor",
    "Kebutuhan Proyek",
    "Penggantian APD Rusak",
    "Uji Kalibrasi Alat",
  ];

  const handleSubmit = () => {
    if (!selectedItemId) {
      setErrorMsg("Pilih barang yang akan dikeluarkan terlebih dahulu.");
      return;
    }
    if (qty <= 0) {
      setErrorMsg("Jumlah pengeluaran harus lebih besar dari 0.");
      return;
    }
    if (!selectedPersonId) {
      setErrorMsg("Pilih nama karyawan pemakai barang.");
      return;
    }

    setErrorMsg("");
    const clientUuid = crypto.randomUUID();

    // Mode Offline Langsung jika tidak ada jaringan
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      enqueueOutboxItem(
        "STOCK_OUT",
        {
          itemId: selectedItemId,
          qty,
          personId: selectedPersonId,
          projectId: selectedProjectId || null,
          note: note.trim() || null,
        },
        clientUuid
      ).then(() => {
        notifyOutboxChanged();
        setStockMap((prev) => ({
          ...prev,
          [selectedItemId]: (prev[selectedItemId] || 0) - qty,
        }));
        setSuccessData({
          itemName: selectedItem?.name || "",
          qty,
          unitName: selectedItem?.unit?.name || "Pcs",
          isOffline: true,
        });
        setQty(1);
        setNote("");
      });
      return;
    }

    startTransition(async () => {
      try {
        const res = await recordStockOutAction({
          clientUuid,
          itemId: selectedItemId,
          qty,
          personId: selectedPersonId,
          projectId: selectedProjectId || null,
          note: note.trim() || null,
        });

        if (res.success) {
          setSuccessData({
            itemName: selectedItem?.name || "",
            qty,
            unitName: selectedItem?.unit?.name || "Pcs",
            isOffline: false,
          });
          setQty(1);
          setNote("");
        } else {
          setErrorMsg(res.error || "Gagal mencatat pengeluaran.");
        }
      } catch (networkErr) {
        console.warn("Koneksi gagal, menyimpan ke antrean offline:", networkErr);
        await enqueueOutboxItem(
          "STOCK_OUT",
          {
            itemId: selectedItemId,
            qty,
            personId: selectedPersonId,
            projectId: selectedProjectId || null,
            note: note.trim() || null,
          },
          clientUuid
        );
        notifyOutboxChanged();
        setSuccessData({
          itemName: selectedItem?.name || "",
          qty,
          unitName: selectedItem?.unit?.name || "Pcs",
          isOffline: true,
        });
        setQty(1);
        setNote("");
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
            {successData.isOffline ? "Tersimpan di Antrean Offline HP" : "Pengeluaran Berhasil Dicatat!"}
          </h2>
          <div className="mt-2 p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <span className="text-emerald-700 num-mono font-bold text-lg">
              -{successData.qty} {successData.unitName}
            </span>
            <div className="text-xs font-semibold text-slate-800 mt-0.5">{successData.itemName}</div>
          </div>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          {successData.isOffline
            ? "Data mutasi tersimpan di memori HP. Otomatis dibukukan ke server saat koneksi internet aktif kembali."
            : "Saldo stok barang telah terpotong dan dicatat ke dalam buku besar mutasi inventaris."}
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
            Catat Pengeluaran Lainnya
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
          FORM PENGELUARAN
        </span>
      </div>

      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Catat Pengeluaran Barang
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Pemakaian operasional, perlengkapan APD, dan peralatan riksa uji lapangan.
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
              <Package className="w-4 h-4 text-emerald-600" />
              <span>1. Pilih Barang yang Diambil</span>
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
                    const itemStock = stockMap[item.id] || 0;
                    const isLow = item.min_stock !== null && itemStock <= (item.min_stock || 0);
                    const isOut = itemStock <= 0;
                    const photoUrl = getItemPhotoPublicUrl(item.photo_path);

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setSelectedItemId(item.id);
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
                              <span>{item.unit?.name}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span
                            className={cn(
                              "inline-block num-mono font-bold text-xs px-2 py-0.5 rounded-lg border",
                              isOut
                                ? "bg-rose-50 text-rose-700 border-rose-200"
                                : isLow
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            )}
                          >
                            Stok: {itemStock}
                          </span>
                        </div>
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
                    <Package className="w-6 h-6 stroke-[2.2]" />
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
                  <div className="text-xs text-slate-700 mt-0.5">
                    Saldo gudang saat ini:{" "}
                    <strong className="num-mono font-bold text-emerald-800 text-sm">
                      {currentStock}
                    </strong>{" "}
                    {selectedItem.unit?.name}
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

        {/* 2. JUMLAH & STEPPER BESAR */}
        {selectedItem && (
          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            <label className="text-xs font-bold text-slate-900 flex items-center justify-between">
              <span>2. Kuantitas Barang Keluar ({selectedItem.unit?.name})</span>
              <span className="text-[11px] font-semibold text-slate-500">
                Tersedia: {currentStock} {selectedItem.unit?.name}
              </span>
            </label>

            {/* Stepper Touch Target Besar */}
            <div className="flex items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => setQty((prev) => Math.max(1, prev - 1))}
                className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-800 shadow-xs active:scale-90 touch-target text-xl font-bold transition-transform"
                aria-label="Kurangi 1"
              >
                <Minus className="w-6 h-6 stroke-[2.5]" />
              </button>

              <div className="flex-1 text-center">
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  value={qty}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setQty(isNaN(val) ? 1 : Math.max(1, val));
                  }}
                  className="w-full text-center text-4xl font-extrabold text-slate-900 bg-transparent focus:outline-none num-mono tracking-tight"
                />
                <span className="text-xs font-bold text-slate-500 block mt-0.5">
                  {selectedItem.unit?.name}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setQty((prev) => prev + 1)}
                className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-800 shadow-xs active:scale-90 touch-target text-xl font-bold transition-transform"
                aria-label="Tambah 1"
              >
                <Plus className="w-6 h-6 stroke-[2.5]" />
              </button>
            </div>

            {/* Quick Chips Increment (+1, +5, +10, Max) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1 no-scrollbar">
              {[1, 5, 10, 25].map((inc) => (
                <button
                  key={inc}
                  type="button"
                  onClick={() => setQty((prev) => prev + inc)}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 text-xs font-bold text-slate-700 touch-target active:scale-95 transition-all shadow-2xs"
                >
                  +{inc}
                </button>
              ))}

              {currentStock > 0 && (
                <button
                  type="button"
                  onClick={() => setQty(currentStock)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold touch-target active:scale-95 transition-all shadow-2xs whitespace-nowrap"
                >
                  Semua Stok ({currentStock})
                </button>
              )}
            </div>

            {/* Peringatan jika melebihi stok sistem */}
            {qty > currentStock && (
              <div className="p-3 rounded-2xl bg-amber-50 text-amber-900 border border-amber-200 text-xs flex items-center gap-2.5 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Perhatian: Saldo tercatat ({currentStock}) lebih sedikit dari jumlah yang dikeluarkan ({qty}).
                  Sistem tetap mencatat agar pekerjaan operasional riksa uji tidak terhambat.
                </span>
              </div>
            )}
          </div>
        )}

        {/* 3. PEMAKAI, PROYEK & KETERANGAN */}
        <div className="space-y-3.5 pt-2 border-t border-slate-100">
          {/* Pemakai Barang */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <User className="w-4 h-4 text-emerald-600" />
              <span>3. Karyawan Pemakai Barang</span>
              <span className="text-rose-600">*</span>
            </label>
            <select
              value={selectedPersonId}
              onChange={(e) => setSelectedPersonId(e.target.value)}
              className="w-full min-h-[48px] py-3 px-3.5 rounded-2xl border border-slate-300 bg-white text-xs sm:text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none touch-target"
            >
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.position}
                </option>
              ))}
            </select>
          </div>

          {/* Proyek / Keperluan */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-emerald-600" />
              <span>Proyek / Keperluan (Opsional)</span>
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full min-h-[48px] py-3 px-3.5 rounded-2xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none touch-target"
            >
              <option value="">-- Keperluan Umum / Operasional Kantor --</option>
              {projects.map((proj) => (
                <option key={proj.id} value={proj.id}>
                  {proj.name} {proj.client ? `(${proj.client})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Keterangan Tambahan dengan Quick Tags */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>Keterangan / Catatan Pemakaian</span>
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Misal: Untuk riksa uji lapangan alat angkat..."
              className="w-full min-h-[48px] py-3 px-3.5 rounded-2xl border border-slate-300 bg-white text-xs sm:text-sm text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none touch-target"
            />

            {/* Quick Note Tags */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1 no-scrollbar">
              {quickNotes.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setNote((prev) => (prev ? `${prev}, ${tag}` : tag))}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-[11px] font-semibold text-slate-600 border border-slate-200 transition-colors touch-target whitespace-nowrap"
                >
                  +{tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tombol Simpan Pengeluaran (Tinggi Minimal 56px) */}
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
            ? "Mencatat Pengeluaran..."
            : selectedItem
            ? `Simpan Pengeluaran (${qty} ${selectedItem.unit?.name})`
            : "Pilih Barang Terlebih Dahulu"}
        </button>
      </div>

      {/* Lightbox Pratinjau Foto Barang */}
      {lightboxUrl && (
        <ImageLightboxModal
          isOpen={true}
          onClose={() => setLightboxUrl(null)}
          imageUrl={lightboxUrl}
          title={`Foto Barang: ${lightboxTitle}`}
          altText={lightboxTitle}
        />
      )}
    </div>
  );
}
