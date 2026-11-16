"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowDownLeft,
  ClipboardList,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

type TopicId = "keluar" | "masuk" | "opname";

interface TopicData {
  id: TopicId;
  title: string;
  subtitle: string;
  icon: typeof ArrowUpRight;
  badge: string;
  colorClass: {
    bg: string;
    border: string;
    text: string;
    activeBg: string;
  };
  link: {
    href: string;
    label: string;
  };
  steps: {
    num: number;
    text: string;
    subtext?: string;
  }[];
}

const TOPICS: TopicData[] = [
  {
    id: "keluar",
    title: "Catat Barang Keluar",
    subtitle: "Saat barang diambil untuk dipakai bekerja",
    icon: ArrowUpRight,
    badge: "Langkah A",
    colorClass: {
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      text: "text-emerald-800",
      activeBg: "bg-emerald-600 text-white",
    },
    link: {
      href: "/keluar",
      label: "Buka Form Catat Keluar",
    },
    steps: [
      {
        num: 1,
        text: "Tekan tombol Catat Keluar di Beranda atau melalui menu Catat di navigasi bawah.",
      },
      {
        num: 2,
        text: "Cari nama barang yang diambil dan ketik jumlah barang yang dipakai.",
      },
      {
        num: 3,
        text: "Pilih nama karyawan pengguna barang dari daftar lalu tekan Simpan Pengeluaran.",
      },
      {
        num: 4,
        text: "Jika salah mencatat jangan diedit, buat transaksi Koreksi di menu Riwayat dengan menyertakan alasan yang jelas.",
      },
    ],
  },
  {
    id: "masuk",
    title: "Catat Barang Masuk",
    subtitle: "Saat menerima pembelian barang baru dari supplier",
    icon: ArrowDownLeft,
    badge: "Langkah B",
    colorClass: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-800",
      activeBg: "bg-blue-600 text-white",
    },
    link: {
      href: "/masuk",
      label: "Buka Form Catat Masuk",
    },
    steps: [
      {
        num: 1,
        text: "Tekan tombol Catat Masuk di Beranda atau melalui menu Catat di navigasi bawah.",
      },
      {
        num: 2,
        text: "Cari barang yang diterima dan isi jumlah sesuai kemasan beli; aplikasi akan otomatis mengonversinya ke satuan pakai gudang.",
      },
      {
        num: 3,
        text: "Isi harga satuan pembelian serta nama supplier lalu tekan Simpan Penerimaan.",
      },
    ],
  },
  {
    id: "opname",
    title: "Hitung Fisik (Opname)",
    subtitle: "Pemeriksaan berkala stok fisik di rak dan gudang",
    icon: ClipboardList,
    badge: "Langkah C",
    colorClass: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      text: "text-amber-900",
      activeBg: "bg-amber-600 text-white",
    },
    link: {
      href: "/opname",
      label: "Buka Menu Stock Opname",
    },
    steps: [
      {
        num: 1,
        text: "Buka menu Opname lalu tekan Lanjutkan Hitung atau Mulai Opname Baru.",
      },
      {
        num: 2,
        text: "Hitung barang nyata di rak dan isi angkanya; angka stok catatan sistem sengaja tidak ditampilkan agar hitungan murni objektif.",
      },
      {
        num: 3,
        text: "Jika ditemukan selisih besar, lakukan hitung ulang oleh petugas yang berbeda lalu isi alasan selisihnya.",
      },
      {
        num: 4,
        text: "Kirim hasil hitung ke penyetuju (orang lain yang bukan petugas penghitung) untuk persetujuan Direktur dan pembukuan resmi.",
      },
    ],
  },
];

export function PanduanClient() {
  const [activeTopicId, setActiveTopicId] = useState<TopicId>("keluar");

  const activeTopic = TOPICS.find((t) => t.id === activeTopicId) || TOPICS[0];
  const IconComponent = activeTopic.icon;

  return (
    <div className="space-y-5">
      {/* Header Halaman */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Panduan Praktis
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Tata cara pencatatan stok dan prosedur operasional lapangan
        </p>
      </div>

      {/* Satu Kalimat Pembagian Peran di Bagian Atas Sesuai Butir 4 */}
      <div className="p-4 rounded-2xl bg-white border-2 border-slate-200 shadow-xs flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
          <ShieldCheck className="w-5 h-5 stroke-[2.3]" />
        </div>
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Ketentuan Peran Pengguna
          </span>
          <p className="text-xs sm:text-sm font-semibold text-slate-900 mt-0.5 leading-relaxed">
            Admin mencatat barang dan mengelola opname. Yang menghitung tidak bisa menyetujui hitungannya sendiri. Persetujuan akhir oleh Direktur.
          </p>
        </div>
      </div>

      {/* DAFTAR ISI BERUPA TOMBOL (BUKAN TEKS PANJANG) */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-600 block">
          Pilih Topik Panduan:
        </label>
        <div className="grid grid-cols-3 gap-2">
          {TOPICS.map((topic) => {
            const isSelected = topic.id === activeTopicId;
            const TopicIcon = topic.icon;
            return (
              <button
                key={topic.id}
                type="button"
                onClick={() => setActiveTopicId(topic.id)}
                className={cn(
                  "p-3 rounded-2xl border-2 text-center transition-all touch-target flex flex-col items-center justify-center gap-1.5 min-h-[72px]",
                  isSelected
                    ? "bg-slate-900 border-slate-900 text-white shadow-sm"
                    : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                )}
              >
                <TopicIcon className={cn("w-5 h-5 stroke-[2.5]", isSelected ? "text-white" : "text-slate-600")} />
                <span className="text-xs font-bold leading-tight block">
                  {topic.id === "keluar" ? "Barang Keluar" : topic.id === "masuk" ? "Barang Masuk" : "Hitung Fisik"}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* KARTU TOPIK AKTIF DENGAN LANGKAH BERNOMOR (MAKSIMAL 1 KALIMAT PER LANGKAH) */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border-2 border-slate-200 shadow-xs space-y-5 animate-in fade-in duration-150">
        {/* Header Topik */}
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", activeTopic.colorClass.bg)}>
            <IconComponent className={cn("w-6 h-6 stroke-[2.5]", activeTopic.colorClass.text)} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                {activeTopic.badge}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
              {activeTopic.title}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {activeTopic.subtitle}
            </p>
          </div>
        </div>

        {/* Daftar Langkah Bernomor */}
        <div className="space-y-3.5">
          {activeTopic.steps.map((step) => (
            <div
              key={step.num}
              className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200"
            >
              <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {step.num}
              </span>
              <p className="text-xs sm:text-sm font-medium text-slate-800 leading-relaxed">
                {step.text}
              </p>
            </div>
          ))}
        </div>

        {/* Tombol Aksi Langsung ke Halaman Fitur */}
        <div className="pt-2">
          <Link
            href={activeTopic.link.href}
            className="w-full min-h-[52px] py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-xs touch-target flex items-center justify-center gap-2 active:scale-98 transition-all"
          >
            <span>{activeTopic.link.label}</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
