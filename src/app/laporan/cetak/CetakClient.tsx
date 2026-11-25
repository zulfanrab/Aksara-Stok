"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, Image as ImageIcon } from "lucide-react";
import type { StockSummaryItem, PersonUsageSummary, ProjectUsageSummary, InventoryMetrics } from "@/lib/services/reports";
import { getItemPhotoPublicUrl } from "@/lib/storage";

interface CetakClientProps {
  data: {
    stockSummary: StockSummaryItem[];
    personUsage: PersonUsageSummary[];
    projectUsage: ProjectUsageSummary[];
    metrics: InventoryMetrics;
    printDate: string;
  };
  activeTab: string;
  initialStatus?: string;
  initialCategory?: string;
  initialQuery?: string;
}

export function CetakClient({
  data,
  activeTab,
  initialStatus = "ALL",
  initialCategory = "ALL",
  initialQuery = "",
}: CetakClientProps) {
  const [onlyWithPhoto, setOnlyWithPhoto] = useState(false);
  const [photoSize, setPhotoSize] = useState<"large" | "medium">("large");

  const printDateObj = new Date(data.printDate);
  const dateStr = printDateObj.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const monthYearLabel = printDateObj.toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });

  const nowYear = printDateObj.getFullYear();
  const nowMonth = String(printDateObj.getMonth() + 1).padStart(2, "0");

  const isStock = activeTab === "STOCK";
  const isPeople = activeTab === "PEOPLE";
  const isProjects = activeTab === "PROJECTS";

  const filteredStock = useMemo(() => {
    const q = initialQuery.trim().toLowerCase();
    return data.stockSummary.filter((item) => {
      const matchQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q);
      const matchStatus = initialStatus === "ALL" || item.status === initialStatus;
      const matchCategory = initialCategory === "ALL" || item.categoryCode === initialCategory;
      const matchPhoto = !onlyWithPhoto || Boolean(item.photo_path);
      return matchQuery && matchStatus && matchCategory && matchPhoto;
    });
  }, [data.stockSummary, initialQuery, initialStatus, initialCategory, onlyWithPhoto]);

  const filteredPeople = useMemo(() => {
    const q = initialQuery.trim().toLowerCase();
    if (!q) return data.personUsage;
    return data.personUsage.filter(
      (p) =>
        p.person.name.toLowerCase().includes(q) ||
        p.person.position.toLowerCase().includes(q) ||
        p.person.employee_code.toLowerCase().includes(q)
    );
  }, [data.personUsage, initialQuery]);

  const filteredProjects = useMemo(() => {
    const q = initialQuery.trim().toLowerCase();
    if (!q) return data.projectUsage;
    return data.projectUsage.filter(
      (pr) =>
        pr.project.name.toLowerCase().includes(q) ||
        (pr.project.client && pr.project.client.toLowerCase().includes(q))
    );
  }, [data.projectUsage, initialQuery]);

  const activeFilterNotes: string[] = [];
  if (isStock && initialStatus !== "ALL") activeFilterNotes.push(`Status: ${initialStatus}`);
  if (isStock && initialCategory !== "ALL") activeFilterNotes.push(`Kategori: ${initialCategory}`);
  if (initialQuery.trim()) activeFilterNotes.push(`Kata kunci: "${initialQuery.trim()}"`);
  if (isStock && onlyWithPhoto) activeFilterNotes.push("Hanya barang berfoto");

  const documentTitle = isStock
    ? "REKAPITULASI STOK PERSEDIAAN GUDANG"
    : isPeople
    ? "ANALISIS PEMAKAIAN BARANG PER KARYAWAN"
    : "LAPORAN PEMAKAIAN INVENTARIS PER PROYEK";

  const docNumber = `ARP/LOG-${isStock ? "STK" : isPeople ? "USR" : "PRJ"}/${nowYear}/${nowMonth}/001`;

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-8 print:p-0 print:bg-white text-slate-800">
      {/* Tombol Aksi & Kontrol Cetak (Hidden Saat Cetak) */}
      <div className="max-w-[210mm] mx-auto mb-5 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link
          href="/laporan"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-semibold hover:bg-slate-50 touch-target"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Laporan</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {isStock && (
            <>
              <button
                type="button"
                onClick={() => setPhotoSize((prev) => (prev === "large" ? "medium" : "large"))}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 touch-target"
              >
                <ImageIcon className="w-4 h-4 text-[#299775]" />
                <span>{photoSize === "large" ? "Ukuran Foto: Besar (96px)" : "Ukuran Foto: Sedang (64px)"}</span>
              </button>

              <button
                type="button"
                onClick={() => setOnlyWithPhoto((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold touch-target transition-colors ${
                  onlyWithPhoto
                    ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                    : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span>{onlyWithPhoto ? "Semua Barang" : "Hanya Berfoto"}</span>
              </button>
            </>
          )}

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[var(--brand-print,#299775)] hover:bg-[#1e6d55] text-white text-xs font-bold shadow-sm touch-target active:scale-95 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Dokumen Sekarang (A4 / PDF)</span>
          </button>
        </div>
      </div>

      {/* Lembar Dokumen Kertas A4 */}
      <div className="max-w-[210mm] min-h-[297mm] mx-auto bg-white p-6 sm:p-10 shadow-md print:shadow-none print:p-0 border border-slate-200 print:border-none space-y-5">
        {/* Kop Surat Resmi */}
        <div className="border-b-2 border-[#299775] pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Logo Resmi PT Aksara Riksa Perdana */}
              <img
                src="/logo.webp"
                alt="Logo PT Aksara Riksa Perdana"
                className="w-14 h-14 rounded-xl object-cover shrink-0 border border-slate-200 shadow-2xs"
              />
              <div>
                <h1 className="text-xl font-bold tracking-tight text-[#299775]">
                  PT AKSARA RIKSA PERDANA
                </h1>
                <p className="text-xs text-slate-600 font-medium">
                  Jasa Pemeriksaan, Pengujian K3, dan Sertifikasi Teknis
                </p>
                <p className="text-[11px] text-slate-400">
                  Gedung Graha Aksara, Jl. Inspeksi K3 No. 12, Jawa Barat &bull; logistik@aksarariksa.co.id
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-bold px-2.5 py-1 rounded bg-slate-100 text-slate-700 block mb-1">
                DOKUMEN RESMI
              </span>
              <span className="text-[10px] text-slate-500 num-mono">{docNumber}</span>
            </div>
          </div>
          {/* Garis Aksen Emas */}
          <div className="h-0.5 bg-[#B48A25] mt-3" />
        </div>

        {/* Judul & Metadata Laporan */}
        <div className="text-center space-y-1">
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide">
            {documentTitle}
          </h2>
          <p className="text-xs text-slate-500">
            Periode: <strong>{monthYearLabel}</strong> &bull; Dicetak: {dateStr}
          </p>
          {activeFilterNotes.length > 0 && (
            <p className="text-[11px] text-slate-600 font-medium">
              Filter aktif: {activeFilterNotes.join(" • ")}
            </p>
          )}
        </div>

        {/* KONTEN TABEL DATA */}
        {isStock && (
          <div className="space-y-4">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="bg-[#299775] text-white">
                  <th className="p-2 border border-slate-300 text-center w-8">No</th>
                  <th
                    className={
                      photoSize === "large"
                        ? "p-2 border border-slate-300 text-center w-28"
                        : "p-2 border border-slate-300 text-center w-20"
                    }
                  >
                    Foto
                  </th>
                  <th className="p-2 border border-slate-300">Kode</th>
                  <th className="p-2 border border-slate-300">Nama Barang</th>
                  <th className="p-2 border border-slate-300">Kategori</th>
                  <th className="p-2 border border-slate-300 text-right">Stok Fisik</th>
                  <th className="p-2 border border-slate-300">Satuan</th>
                  <th className="p-2 border border-slate-300 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredStock.map((item, idx) => (
                  <tr key={item.id} className="even:bg-slate-50">
                    <td className="p-1.5 border border-slate-200 text-center align-middle">{idx + 1}</td>
                    <td className="p-1.5 border border-slate-200 text-center align-middle">
                      {item.photo_path ? (
                        <img
                          src={getItemPhotoPublicUrl(item.photo_path) || ""}
                          alt={item.name}
                          className={
                            photoSize === "large"
                              ? "w-24 h-24 object-contain bg-white rounded-md mx-auto border border-slate-200 p-0.5"
                              : "w-16 h-16 object-contain bg-white rounded-md mx-auto border border-slate-200 p-0.5"
                          }
                        />
                      ) : (
                        <span className="text-[10px] text-slate-300">-</span>
                      )}
                    </td>
                    <td className="p-1.5 border border-slate-200 num-mono font-bold text-slate-800 align-middle whitespace-nowrap">
                      {item.code}
                    </td>
                    <td className="p-1.5 border border-slate-200 font-semibold align-middle">{item.name}</td>
                    <td className="p-1.5 border border-slate-200 text-slate-600 align-middle">{item.categoryName}</td>
                    <td className="p-1.5 border border-slate-200 text-right num-mono font-bold align-middle">
                      {item.currentStock}
                    </td>
                    <td className="p-1.5 border border-slate-200 align-middle">{item.unitName}</td>
                    <td className="p-1.5 border border-slate-200 text-center font-bold align-middle">
                      <span
                        className={
                          item.status === "AMAN"
                            ? "text-emerald-700"
                            : item.status === "MENIPIS"
                            ? "text-amber-700"
                            : "text-rose-700"
                        }
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {isPeople && (
          <div className="space-y-4">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#299775] text-white">
                  <th className="p-2 border border-slate-300 text-center w-8">No</th>
                  <th className="p-2 border border-slate-300">NIP</th>
                  <th className="p-2 border border-slate-300">Nama Karyawan</th>
                  <th className="p-2 border border-slate-300">Jabatan</th>
                  <th className="p-2 border border-slate-300 text-right">Frekuensi</th>
                  <th className="p-2 border border-slate-300 text-right">Total Kuantitas</th>
                  <th className="p-2 border border-slate-300">Rincian Barang Diambil</th>
                </tr>
              </thead>
              <tbody>
                {filteredPeople.map((p, idx) => (
                  <tr key={p.person.id} className="even:bg-slate-50">
                    <td className="p-1.5 border border-slate-200 text-center">{idx + 1}</td>
                    <td className="p-1.5 border border-slate-200 num-mono font-bold">
                      {p.person.employee_code}
                    </td>
                    <td className="p-1.5 border border-slate-200 font-bold">{p.person.name}</td>
                    <td className="p-1.5 border border-slate-200 text-slate-600">{p.person.position}</td>
                    <td className="p-1.5 border border-slate-200 text-right num-mono">
                      {p.totalTransactions}x
                    </td>
                    <td className="p-1.5 border border-slate-200 text-right num-mono font-bold text-[#299775]">
                      {p.totalQuantity} unit
                    </td>
                    <td className="p-1.5 border border-slate-200 text-[11px] text-slate-600">
                      {p.itemsBreakdown.length === 0
                        ? "-"
                        : p.itemsBreakdown
                            .map((i) => `${i.itemName} (${i.totalQty})`)
                            .join(", ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {isProjects && (
          <div className="space-y-4">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#299775] text-white">
                  <th className="p-2 border border-slate-300 text-center w-8">No</th>
                  <th className="p-2 border border-slate-300">Nama Proyek</th>
                  <th className="p-2 border border-slate-300">Klien</th>
                  <th className="p-2 border border-slate-300 text-right">Frekuensi</th>
                  <th className="p-2 border border-slate-300 text-right">Total Kuantitas</th>
                  <th className="p-2 border border-slate-300">Rincian Barang</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map((pr, idx) => (
                  <tr key={pr.project.id} className="even:bg-slate-50">
                    <td className="p-1.5 border border-slate-200 text-center">{idx + 1}</td>
                    <td className="p-1.5 border border-slate-200 font-bold">{pr.project.name}</td>
                    <td className="p-1.5 border border-slate-200 text-slate-600">
                      {pr.project.client || "-"}
                    </td>
                    <td className="p-1.5 border border-slate-200 text-right num-mono">
                      {pr.totalTransactions}x
                    </td>
                    <td className="p-1.5 border border-slate-200 text-right num-mono font-bold text-[#299775]">
                      {pr.totalQuantity} unit
                    </td>
                    <td className="p-1.5 border border-slate-200 text-[11px] text-slate-600">
                      {pr.itemsBreakdown.length === 0
                        ? "-"
                        : pr.itemsBreakdown.map((i) => `${i.itemName} (${i.totalQty})`).join(", ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Kolom Tanda Tangan Resmi Pengesahan */}
        <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs break-inside-avoid">
          <div className="space-y-1">
            <p className="text-slate-500">Dibuat oleh,</p>
            <p className="font-bold text-slate-800">Admin Pengelola Gudang</p>
            <div className="h-16" />
            <p className="font-bold underline text-slate-900">M. Fazar Maulana (Ajay)</p>
            <p className="text-[10px] text-slate-400">Technical Administration Officer</p>
          </div>

          <div className="space-y-1">
            <p className="text-slate-500">Mengetahui & Menyetujui,</p>
            <p className="font-bold text-slate-800">Direktur PT Aksara Riksa Perdana</p>
            <div className="h-16" />
            <p className="font-bold underline text-slate-900">Habsi Gufira P., S.AP.</p>
            <p className="text-[10px] text-slate-400">Director</p>
          </div>
        </div>
      </div>
    </div>
  );
}
