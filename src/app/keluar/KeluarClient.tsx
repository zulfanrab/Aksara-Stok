"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Minus, ArrowLeft, CheckCircle2, AlertTriangle, User, Briefcase, FileText, Package } from "lucide-react";
import Link from "next/link";
import type { Item, Person, Project } from "@/types/inventory";
import { recordStockOutAction } from "@/lib/actions/stock";
import { cn } from "@/lib/utils";

interface KeluarClientProps {
  items: Item[];
  people: Person[];
  projects: Project[];
  stockMap: Record<string, number>;
}

export function KeluarClient({ items, people, projects, stockMap }: KeluarClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [searchItem, setSearchItem] = useState<string>("");
  const [qty, setQty] = useState<number>(1);
  const [selectedPersonId, setSelectedPersonId] = useState<string>(people[0]?.id || "");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [note, setNote] = useState<string>("");

  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successData, setSuccessData] = useState<{ itemName: string; qty: number; unitName: string } | null>(null);

  // Selected item object
  const selectedItem = items.find((i) => i.id === selectedItemId);
  const currentStock = selectedItem ? stockMap[selectedItem.id] || 0 : 0;

  // Filter items untuk dropdown/pencarian
  const filteredItems = searchItem.trim()
    ? items.filter(
        (i) =>
          i.name.toLowerCase().includes(searchItem.toLowerCase()) ||
          i.code.toLowerCase().includes(searchItem.toLowerCase())
      ).slice(0, 8)
    : items.slice(0, 6);

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

    startTransition(async () => {
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
        });
        // Reset form
        setQty(1);
        setNote("");
      } else {
        setErrorMsg(res.error || "Gagal mencatat pengeluaran.");
      }
    });
  };

  if (successData) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-2xl p-6 border border-[var(--slate-200)] shadow-xs text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-[var(--emerald-50)] text-[var(--emerald-600)] flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-[var(--slate-900)]">Pengeluaran Berhasil Dicatat!</h2>
        <p className="text-sm text-[var(--slate-700)]">
          <strong className="text-[var(--emerald-700)] num-mono font-bold">{successData.qty} {successData.unitName}</strong>{" "}
          &bull; {successData.itemName}
        </p>
        <p className="text-xs text-[var(--slate-400)]">
          Tercatat secara idempoten pada ledger append-only stock_movements.
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
            Catat Barang Keluar Lainnya
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
        <span className="text-xs font-bold text-[var(--slate-400)] num-mono">CATAT KELUAR</span>
      </div>

      <div className="bg-white rounded-2xl p-5 border border-[var(--slate-200)] shadow-xs space-y-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--slate-900)] tracking-tight">
            Catat Pengeluaran Barang
          </h1>
          <p className="text-xs text-[var(--slate-400)] mt-0.5">
            Pencatatan cepat pemakaian barang habis pakai, APD, dan operasional (&lt; 10 detik).
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
            <Package className="w-3.5 h-3.5 text-[var(--emerald-600)]" />
            <span>1. Pilih Barang yang Dipakai</span>
          </label>

          {!selectedItem ? (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--slate-400)]" />
                <input
                  type="text"
                  value={searchItem}
                  onChange={(e) => setSearchItem(e.target.value)}
                  placeholder="Ketik nama atau kode barang (mis. Amplop, ATK-001)..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-[var(--slate-200)] bg-[var(--bg-canvas)] text-xs sm:text-sm text-[var(--slate-900)] focus:ring-2 focus:ring-[var(--emerald-600)] focus:outline-none touch-target"
                />
              </div>

              {/* Quick suggestions */}
              <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pt-1">
                {filteredItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedItemId(item.id);
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
                <div className="text-xs text-[var(--slate-700)] mt-0.5">
                  Saldo sistem saat ini: <strong className="num-mono font-bold">{currentStock}</strong> {selectedItem.unit?.name}
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

        {/* 2. Jumlah / Stepper Besar */}
        {selectedItem && (
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="text-xs font-bold text-[var(--slate-700)]">
              2. Kuantitas Barang Keluar ({selectedItem.unit?.name})
            </label>

            <div className="flex items-center justify-between gap-3 bg-[var(--bg-canvas)] p-2 rounded-2xl border border-[var(--slate-200)]">
              <button
                type="button"
                onClick={() => setQty((prev) => Math.max(1, prev - 1))}
                className="w-13 h-13 rounded-xl bg-white border border-[var(--slate-200)] flex items-center justify-center text-slate-700 shadow-xs active:scale-95 touch-target text-xl font-bold"
              >
                <Minus className="w-6 h-6" />
              </button>

              <div className="flex-1 text-center">
                <input
                  type="number"
                  min="1"
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full text-center text-3xl font-bold text-[var(--slate-900)] bg-transparent focus:outline-none num-mono"
                />
                <span className="text-xs font-medium text-[var(--slate-400)] block">
                  {selectedItem.unit?.name}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setQty((prev) => prev + 1)}
                className="w-13 h-13 rounded-xl bg-white border border-[var(--slate-200)] flex items-center justify-center text-slate-700 shadow-xs active:scale-95 touch-target text-xl font-bold"
              >
                <Plus className="w-6 h-6" />
              </button>
            </div>

            {/* Peringatan jika melebihi stok sistem */}
            {qty > currentStock && (
              <div className="p-2.5 rounded-xl bg-[var(--amber-50)] text-[var(--amber-700)] border border-[var(--amber-500)]/20 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  Perhatian: Saldo sistem ({currentStock}) lebih sedikit dari jumlah ({qty}). Pengeluaran tetap dicatat agar pekerjaan lapangan tidak tertunda.
                </span>
              </div>
            )}
          </div>
        )}

        {/* 3. Pemakai & Proyek */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <div className="space-y-1">
            <label className="text-xs font-bold text-[var(--slate-700)] flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[var(--emerald-600)]" />
              <span>3. Pemakai Barang (Daftar 13 Karyawan)</span>
            </label>
            <select
              value={selectedPersonId}
              onChange={(e) => setSelectedPersonId(e.target.value)}
              className="w-full py-3 px-3.5 rounded-xl border border-[var(--slate-200)] bg-[var(--bg-canvas)] text-xs sm:text-sm text-[var(--slate-900)] focus:ring-2 focus:ring-[var(--emerald-600)] focus:outline-none touch-target"
            >
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.position})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-[var(--slate-700)] flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-[var(--emerald-600)]" />
              <span>Proyek / Keperluan (Opsional)</span>
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full py-3 px-3.5 rounded-xl border border-[var(--slate-200)] bg-[var(--bg-canvas)] text-xs sm:text-sm text-[var(--slate-900)] focus:ring-2 focus:ring-[var(--emerald-600)] focus:outline-none touch-target"
            >
              <option value="">-- Pilih Proyek / Klien --</option>
              {projects.map((proj) => (
                <option key={proj.id} value={proj.id}>
                  {proj.name} {proj.client ? `(${proj.client})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-[var(--slate-700)] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[var(--emerald-600)]" />
              <span>Keterangan Tambahan (Opsional)</span>
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Misal: Untuk riksa uji lapangan ke PT TML"
              className="w-full py-3 px-3.5 rounded-xl border border-[var(--slate-200)] bg-[var(--bg-canvas)] text-xs sm:text-sm text-[var(--slate-900)] focus:ring-2 focus:ring-[var(--emerald-600)] focus:outline-none touch-target"
            />
          </div>
        </div>

        {/* Tombol Simpan Pengeluaran */}
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
          {isPending ? "Menyimpan ke Ledger..." : "Simpan Pengeluaran (Catat Keluar)"}
        </button>
      </div>
    </div>
  );
}
