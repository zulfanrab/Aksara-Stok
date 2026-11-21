"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  FileSpreadsheet,
  FileText,
  Printer,
  Search,
  Filter,
  Package,
  Users,
  Briefcase,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  Download,
  Calendar,
  Layers,
} from "lucide-react";
import type { StockSummaryItem, PersonUsageSummary, ProjectUsageSummary, InventoryMetrics } from "@/lib/services/reports";
import { exportStockSummaryToExcel, exportPersonUsageToExcel, exportReportToWord } from "@/lib/reports/export";
import { getItemPhotoPublicUrl } from "@/lib/storage";
import { ImageLightboxModal } from "@/components/camera/ImageLightboxModal";
import { cn } from "@/lib/utils";

interface LaporanClientProps {
  data: {
    stockSummary: StockSummaryItem[];
    personUsage: PersonUsageSummary[];
    projectUsage: ProjectUsageSummary[];
    metrics: InventoryMetrics;
    printDate: string;
  };
}

export function LaporanClient({ data }: LaporanClientProps) {
  const [activeTab, setActiveTab] = useState<"STOCK" | "PEOPLE" | "PROJECTS">("STOCK");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [lightboxTitle, setLightboxTitle] = useState<string>("");

  // Daftar kategori unik untuk filter
  const categories = useMemo(() => {
    const map = new Map<string, string>();
    data.stockSummary.forEach((item) => {
      if (item.categoryCode) map.set(item.categoryCode, item.categoryName);
    });
    return Array.from(map.entries()).map(([code, name]) => ({ code, name }));
  }, [data.stockSummary]);

  // Filter rekapitulasi stok
  const filteredStock = useMemo(() => {
    return data.stockSummary.filter((item) => {
      const matchSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === "ALL" || item.status === statusFilter;
      const matchCategory = categoryFilter === "ALL" || item.categoryCode === categoryFilter;
      return matchSearch && matchStatus && matchCategory;
    });
  }, [data.stockSummary, searchTerm, statusFilter, categoryFilter]);

  // Filter pemakaian karyawan
  const filteredPeople = useMemo(() => {
    return data.personUsage.filter((p) => {
      return (
        p.person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.person.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.person.employee_code.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [data.personUsage, searchTerm]);

  // Filter pemakaian proyek
  const filteredProjects = useMemo(() => {
    return data.projectUsage.filter((pr) => {
      return (
        pr.project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (pr.project.client && pr.project.client.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    });
  }, [data.projectUsage, searchTerm]);

  // Export handlers
  const handleExportExcel = () => {
    if (activeTab === "STOCK") {
      exportStockSummaryToExcel(filteredStock);
    } else if (activeTab === "PEOPLE") {
      exportPersonUsageToExcel(data.personUsage);
    } else {
      // Export Proyek ke Excel
      const headers = ["No", "Nama Proyek", "Klien", "Total Pengeluaran", "Item Diambil"];
      const rows = data.projectUsage.map((p, idx) => [
        String(idx + 1),
        p.project.name,
        p.project.client || "-",
        `${p.totalQuantity} unit`,
        p.itemsBreakdown.map((i) => `${i.itemName} (${i.totalQty})`).join(", "),
      ]);
      exportReportToWord({
        reportTitle: "Laporan Pemakaian Barang per Proyek",
        tableHeaders: headers,
        tableRows: rows,
      });
    }
  };

  const handleExportWord = () => {
    if (activeTab === "STOCK") {
      const headers = ["No", "Foto", "Kode", "Nama Barang", "Kategori", "Stok", "Satuan", "Status"];
      const rows = filteredStock.map((i, idx) => {
        const photoUrl = getItemPhotoPublicUrl(i.photo_path);
        const photoHtml = photoUrl
          ? `<img src="${photoUrl}" width="50" height="50" style="object-fit:cover; display:block; margin-bottom:2px;" /><a href="${photoUrl}">Buka Foto</a>`
          : "-";

        return [
          String(idx + 1),
          photoHtml,
          i.code,
          i.name,
          i.categoryName,
          String(i.currentStock),
          i.unitName,
          i.status,
        ];
      });
      exportReportToWord({
        reportTitle: "Laporan Rekapitulasi Stok Inventaris",
        tableHeaders: headers,
        tableRows: rows,
      });
    } else if (activeTab === "PEOPLE") {
      const headers = ["No", "NIP / Kode", "Nama Karyawan", "Jabatan", "Frekuensi", "Total Kuantitas"];
      const rows = data.personUsage.map((p, idx) => [
        String(idx + 1),
        p.person.employee_code,
        p.person.name,
        p.person.position,
        `${p.totalTransactions} kali`,
        `${p.totalQuantity} unit`,
      ]);
      exportReportToWord({
        reportTitle: "Laporan Pemakaian Barang per Pengguna (13 Karyawan)",
        tableHeaders: headers,
        tableRows: rows,
      });
    } else {
      const headers = ["No", "Nama Proyek", "Klien", "Total Pemakaian", "Rincian Barang"];
      const rows = data.projectUsage.map((pr, idx) => [
        String(idx + 1),
        pr.project.name,
        pr.project.client || "-",
        `${pr.totalQuantity} unit`,
        pr.itemsBreakdown.map((i) => `${i.itemName} (${i.totalQty})`).join(", "),
      ]);
      exportReportToWord({
        reportTitle: "Laporan Pemakaian Inventaris per Proyek",
        tableHeaders: headers,
        tableRows: rows,
      });
    }
  };

  return (
    <div className="space-y-5">
      {/* Header & Quick Action Buttons */}
      <div className="bg-white rounded-2xl p-5 border border-[var(--slate-200)] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[var(--emerald-50)] text-[var(--emerald-700)] text-xs font-semibold mb-2">
              <Calendar className="w-3.5 h-3.5" />
              <span>Laporan Inventaris</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--slate-900)] tracking-tight">
              Rekapitulasi & Analisis Pemakaian
            </h1>
            <p className="text-xs text-[var(--slate-400)] mt-1">
              Data stok terkini, analisis pemakaian barang, dan ekspor laporan resmi.
            </p>
          </div>

          {/* 3 Tombol Ekspor Utama */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs touch-target active:scale-95 transition-all"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Ekspor Excel</span>
            </button>

            <button
              onClick={handleExportWord}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs touch-target active:scale-95 transition-all"
            >
              <FileText className="w-4 h-4" />
              <span>Ekspor Word</span>
            </button>

            <Link
              href={`/laporan/cetak?tab=${activeTab.toLowerCase()}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs shadow-xs touch-target active:scale-95 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak PDF A4</span>
            </Link>
          </div>
        </div>

        {/* 4 Kartu Metrik Ringkasan */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-slate-100">
          <div className="bg-[var(--bg-canvas)] p-3 rounded-xl border border-[var(--slate-200)]">
            <span className="text-[11px] text-[var(--slate-400)] font-medium block">Total Master Barang</span>
            <span className="text-lg font-bold text-[var(--slate-900)] num-mono">
              {data.metrics.totalItems} Item
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              {data.metrics.totalCategories} Kategori
            </span>
          </div>

          <div className="bg-[var(--bg-canvas)] p-3 rounded-xl border border-[var(--slate-200)]">
            <span className="text-[11px] text-[var(--slate-400)] font-medium block">Status Aman</span>
            <span className="text-lg font-bold text-[var(--emerald-700)] num-mono">
              {data.metrics.amanCount} Item
            </span>
            <span className="text-[10px] text-[var(--emerald-600)] block mt-0.5">&gt; Batas Minimum</span>
          </div>

          <div className="bg-[var(--bg-canvas)] p-3 rounded-xl border border-[var(--slate-200)]">
            <span className="text-[11px] text-[var(--slate-400)] font-medium block">Menipis / Kritis</span>
            <span className="text-lg font-bold text-amber-700 num-mono">
              {data.metrics.menipisCount} Item
            </span>
            <span className="text-[10px] text-amber-600 block mt-0.5">&le; Batas Minimum</span>
          </div>

          <div className="bg-[var(--bg-canvas)] p-3 rounded-xl border border-[var(--slate-200)]">
            <span className="text-[11px] text-[var(--slate-400)] font-medium block">Stok Habis (0)</span>
            <span className="text-lg font-bold text-rose-700 num-mono">
              {data.metrics.habisCount} Item
            </span>
            <span className="text-[10px] text-rose-600 block mt-0.5">Perlu Pengadaan</span>
          </div>
        </div>
      </div>

      {/* Tab Navigasi */}
      <div className="flex items-center gap-2 border-b border-[var(--slate-200)] pb-2 overflow-x-auto">
        <button
          onClick={() => {
            setActiveTab("STOCK");
            setSearchTerm("");
          }}
          className={cn(
            "px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm inline-flex items-center gap-2 transition-all touch-target shrink-0",
            activeTab === "STOCK"
              ? "bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-xs border border-emerald-700"
              : "bg-white text-slate-700 hover:bg-emerald-50/50 hover:border-emerald-300 border border-slate-200"
          )}
        >
          <Package className="w-4 h-4" />
          <span>Rekap Stok Terkini ({data.stockSummary.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("PEOPLE");
            setSearchTerm("");
          }}
          className={cn(
            "px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm inline-flex items-center gap-2 transition-all touch-target shrink-0",
            activeTab === "PEOPLE"
              ? "bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-xs border border-emerald-700"
              : "bg-white text-slate-700 hover:bg-emerald-50/50 hover:border-emerald-300 border border-slate-200"
          )}
        >
          <Users className="w-4 h-4" />
          <span>Pemakaian per Karyawan (13 Orang)</span>
        </button>

        <button
          onClick={() => {
            setActiveTab("PROJECTS");
            setSearchTerm("");
          }}
          className={cn(
            "px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm inline-flex items-center gap-2 transition-all touch-target shrink-0",
            activeTab === "PROJECTS"
              ? "bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-xs border border-emerald-700"
              : "bg-white text-slate-700 hover:bg-emerald-50/50 hover:border-emerald-300 border border-slate-200"
          )}
        >
          <Briefcase className="w-4 h-4" />
          <span>Pemakaian per Proyek / Klien</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-[var(--slate-200)] shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              activeTab === "STOCK"
                ? "Cari nama atau kode barang..."
                : activeTab === "PEOPLE"
                ? "Cari nama karyawan atau jabatan..."
                : "Cari nama proyek atau klien..."
            }
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--slate-200)] bg-[var(--bg-canvas)] text-xs text-[var(--slate-900)] focus:ring-2 focus:ring-[var(--emerald-600)] focus:outline-none"
          />
        </div>

        {activeTab === "STOCK" && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-2 px-3 rounded-lg border border-[var(--slate-200)] bg-[var(--bg-canvas)] text-xs text-[var(--slate-900)] focus:outline-none"
            >
              <option value="ALL">Semua Status</option>
              <option value="AMAN">Aman (&gt; Min)</option>
              <option value="MENIPIS">Menipis (&le; Min)</option>
              <option value="HABIS">Habis (0)</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="py-2 px-3 rounded-lg border border-[var(--slate-200)] bg-[var(--bg-canvas)] text-xs text-[var(--slate-900)] focus:outline-none"
            >
              <option value="ALL">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* TAB 1: REKAPITULASI STOK TERKINI */}
      {activeTab === "STOCK" && (
        <div className="bg-white rounded-2xl border border-[var(--slate-200)] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--bg-canvas)] border-b border-[var(--slate-200)] text-xs font-bold text-[var(--slate-700)] uppercase">
                <tr>
                  <th className="py-3 px-3 text-center w-12">Foto</th>
                  <th className="py-3 px-4">Barang</th>
                  <th className="py-3 px-3">Kategori</th>
                  <th className="py-3 px-3 text-right">Stok Terkini</th>
                  <th className="py-3 px-3 text-right">Batas Min</th>
                  <th className="py-3 px-3 text-right">Target</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--slate-200)] text-xs sm:text-sm">
                {filteredStock.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Tidak ada barang yang cocok dengan pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredStock.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 text-center align-middle">
                        {item.photo_path ? (
                          <button
                            type="button"
                            onClick={() => {
                              const url = getItemPhotoPublicUrl(item.photo_path);
                              if (url) {
                                setLightboxUrl(url);
                                setLightboxTitle(`${item.name} (${item.code})`);
                              }
                            }}
                            className="relative block w-10 h-10 rounded-lg overflow-hidden border border-slate-200 shadow-2xs hover:opacity-90 active:scale-95 transition-all mx-auto"
                            title="Klik untuk memperbesar"
                          >
                            <img
                              src={getItemPhotoPublicUrl(item.photo_path) || ""}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ) : (
                          <span className="text-slate-300 text-xs">-</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-[var(--slate-900)]">{item.name}</div>
                        <span className="num-mono font-bold text-xs text-[var(--emerald-700)]">
                          {item.code}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-xs text-[var(--slate-700)]">
                        {item.categoryName}
                      </td>

                      <td className="py-3 px-3 text-right num-mono font-bold text-[var(--slate-900)]">
                        {item.currentStock} {item.unitName}
                      </td>

                      <td className="py-3 px-3 text-right num-mono text-slate-500">
                        {item.minStock} {item.unitName}
                      </td>

                      <td className="py-3 px-3 text-right num-mono text-slate-500">
                        {item.targetStock} {item.unitName}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold",
                            item.status === "AMAN"
                              ? "bg-[var(--emerald-50)] text-[var(--emerald-700)]"
                              : item.status === "MENIPIS"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-rose-50 text-rose-700"
                          )}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PEMAKAIAN PER KARYAWAN (13 ORANG) */}
      {activeTab === "PEOPLE" && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredPeople.map((summary) => (
              <div
                key={summary.person.id}
                className="bg-white p-4 rounded-2xl border border-[var(--slate-200)] shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-[var(--slate-900)]">
                      {summary.person.name}
                    </h3>
                    <p className="text-xs text-[var(--slate-400)]">{summary.person.position}</p>
                    <span className="num-mono text-[11px] text-[var(--emerald-700)] font-semibold">
                      {summary.person.employee_code}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="num-mono font-bold text-base text-[var(--slate-900)] block">
                      {summary.totalQuantity} Unit
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {summary.totalTransactions} Transaksi Keluar
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                    Barang yang Pernah Diambil:
                  </span>
                  {summary.itemsBreakdown.length === 0 ? (
                    <span className="text-xs text-slate-400 italic">Belum ada barang yang tercatat keluar</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {summary.itemsBreakdown.map((item) => (
                        <span
                          key={item.itemId}
                          className="px-2 py-0.5 rounded-lg bg-[var(--bg-canvas)] border border-slate-200 text-xs text-slate-700 flex items-center gap-1"
                        >
                          <span>{item.itemName}</span>
                          <strong className="num-mono font-bold text-[var(--emerald-700)]">
                            x{item.totalQty}
                          </strong>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: PEMAKAIAN PER PROYEK / KLIEN */}
      {activeTab === "PROJECTS" && (
        <div className="bg-white rounded-2xl border border-[var(--slate-200)] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--bg-canvas)] border-b border-[var(--slate-200)] text-xs font-bold text-[var(--slate-700)] uppercase">
                <tr>
                  <th className="py-3 px-4">Nama Proyek</th>
                  <th className="py-3 px-3">Klien</th>
                  <th className="py-3 px-3 text-right">Frekuensi Ambil</th>
                  <th className="py-3 px-3 text-right">Total Barang Keluar</th>
                  <th className="py-3 px-4">Rincian Barang</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--slate-200)] text-xs sm:text-sm">
                {filteredProjects.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      Belum ada data pemakaian proyek yang tercatat.
                    </td>
                  </tr>
                ) : (
                  filteredProjects.map((p) => (
                    <tr key={p.project.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-[var(--slate-900)]">
                        {p.project.name}
                      </td>
                      <td className="py-3 px-3 text-slate-600">{p.project.client || "-"}</td>
                      <td className="py-3 px-3 text-right num-mono font-medium">
                        {p.totalTransactions} kali
                      </td>
                      <td className="py-3 px-3 text-right num-mono font-bold text-[var(--emerald-700)]">
                        {p.totalQuantity} unit
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {p.itemsBreakdown.length === 0
                          ? "-"
                          : p.itemsBreakdown
                              .map((i) => `${i.itemName} (${i.totalQty} ${i.unitName})`)
                              .join(", ")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Lightbox Pratinjau Foto Laporan */}
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
