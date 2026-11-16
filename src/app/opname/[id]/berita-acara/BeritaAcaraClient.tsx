"use client";

import Link from "next/link";
import { ArrowLeft, Printer, CheckCircle2, ShieldCheck } from "lucide-react";
import type { StockTakeWithDetails, StockTakeLineWithItem } from "@/lib/services/inventory";

interface BeritaAcaraClientProps {
  stockTake: StockTakeWithDetails;
  lines: StockTakeLineWithItem[];
}

export function BeritaAcaraClient({ stockTake, lines }: BeritaAcaraClientProps) {
  const discrepancyLines = lines.filter((l) => {
    const finalCount = l.recount_qty !== null ? Number(l.recount_qty) : Number(l.counted_qty || 0);
    return finalCount - Number(l.system_qty) !== 0;
  });

  const matchingLinesCount = lines.filter((l) => {
    const finalCount = l.recount_qty !== null ? Number(l.recount_qty) : Number(l.counted_qty || 0);
    return finalCount - Number(l.system_qty) === 0;
  }).length;

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const cutoffDate = new Date(stockTake.cutoff_at).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const printDate = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Tombol Aksi Layar (Disembunyikan saat Cetak) */}
      <div className="print:hidden flex items-center justify-between bg-white p-4 rounded-2xl border border-[var(--slate-200)] shadow-xs">
        <Link
          href={`/opname/${stockTake.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--slate-700)] hover:text-[var(--emerald-700)] touch-target"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Review</span>
        </Link>

        <button
          onClick={handlePrint}
          className="px-5 py-2.5 rounded-xl bg-[var(--brand-print)] hover:bg-[#207a5e] text-white font-bold text-xs shadow-sm touch-target flex items-center gap-2 transition-colors"
        >
          <Printer className="w-4 h-4" />
          <span>Cetak Dokumen / Simpan PDF</span>
        </button>
      </div>

      {/* DOKUMEN CETAK RESMI BERITA ACARA (A4 Styling) */}
      <div className="bg-white p-8 sm:p-12 rounded-2xl border border-[var(--slate-200)] shadow-sm text-slate-900 print:border-none print:shadow-none print:p-0 space-y-6">
        {/* KOP SURAT RESMI PT AKSARA RIKSA PERDANA */}
        <div className="border-b-2 border-[var(--brand-print)] pb-4 space-y-1">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[var(--brand-print)] uppercase">
                PT Aksara Riksa Perdana
              </h1>
              <p className="text-xs text-slate-600 font-medium">
                Jasa Pemeriksaan & Pengujian Keselamatan dan Kesehatan Kerja (K3)
              </p>
            </div>
            {/* Aksen Emas & Brand Badge */}
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#B48A25] bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Official Document
              </span>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">FORM-K3-INV-001</p>
            </div>
          </div>
          <div className="h-0.5 bg-gradient-to-r from-[var(--brand-print)] via-[#B48A25] to-[var(--brand-print)] mt-2" />
        </div>

        {/* JUDUL DOKUMEN */}
        <div className="text-center space-y-1 pt-2">
          <h2 className="text-base sm:text-lg font-bold tracking-tight uppercase text-slate-900 underline decoration-slate-400 underline-offset-4">
            Berita Acara Stock Opname Fisik Persediaan
          </h2>
          <p className="text-xs text-slate-500 font-mono">
            Nomor: BA-SO/ARP/{new Date().getFullYear()}/{stockTake.id.substring(0, 8).toUpperCase()}
          </p>
        </div>

        {/* PARAGRAF PEMBUKA */}
        <p className="text-xs text-slate-700 leading-relaxed text-justify">
          Pada hari ini, bertepatan dengan tanggal cut-off <strong>{cutoffDate}</strong>, telah dilaksanakan
          pemeriksaan fisik persediaan barang secara menyeluruh (Stock Opname) di lingkungan gudang dan kantor pusat
          PT Aksara Riksa Perdana untuk sesi kegiatan: <strong>&ldquo;{stockTake.name}&rdquo;</strong>.
        </p>

        {/* RINGKASAN REKAPITULASI */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
            <span className="text-[11px] text-slate-500 block">Total Item Diperiksa</span>
            <span className="font-bold text-sm font-mono text-slate-900">{lines.length} Item</span>
          </div>
          <div className="p-2.5 rounded-lg border border-slate-200 bg-emerald-50/50">
            <span className="text-[11px] text-emerald-700 block">Fisik Sesuai (0 Selisih)</span>
            <span className="font-bold text-sm font-mono text-emerald-800">{matchingLinesCount} Item</span>
          </div>
          <div className="p-2.5 rounded-lg border border-slate-200 bg-amber-50/50">
            <span className="text-[11px] text-amber-700 block">Item Berselisih</span>
            <span className="font-bold text-sm font-mono text-amber-800">{discrepancyLines.length} Item</span>
          </div>
          <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
            <span className="text-[11px] text-slate-500 block">Status Buku</span>
            <span className="font-bold text-sm text-[var(--brand-print)] uppercase">Telah Disesuaikan</span>
          </div>
        </div>

        {/* TABEL RINCIAN SELISIH */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase text-slate-800 tracking-wider">
            Daftar Rincian Selisih Fisik & Penyesuaian Ledger (ADJUST)
          </h3>

          {discrepancyLines.length === 0 ? (
            <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50 text-xs text-emerald-800 text-center font-medium">
              Hasil Audit: Seluruh barang fisik 100% cocok dengan saldo catatan sistem persediaan (Nihil Selisih).
            </div>
          ) : (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 border-b border-slate-200 font-bold text-slate-700 uppercase">
                  <tr>
                    <th className="py-2 px-3">Kode</th>
                    <th className="py-2 px-3">Nama Barang</th>
                    <th className="py-2 px-2 text-center">Satuan</th>
                    <th className="py-2 px-2 text-right">Sistem</th>
                    <th className="py-2 px-2 text-right">Fisik</th>
                    <th className="py-2 px-2 text-right">Selisih</th>
                    <th className="py-2 px-3">Keterangan / Alasan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {discrepancyLines.map((line) => {
                    const finalCount =
                      line.recount_qty !== null ? Number(line.recount_qty) : Number(line.counted_qty || 0);
                    const diff = finalCount - Number(line.system_qty);
                    return (
                      <tr key={line.id} className="text-slate-800">
                        <td className="py-2 px-3 font-mono font-bold">{line.item?.code}</td>
                        <td className="py-2 px-3 font-medium">{line.item?.name}</td>
                        <td className="py-2 px-2 text-center text-slate-600">{line.item?.unit?.name}</td>
                        <td className="py-2 px-2 text-right font-mono">{line.system_qty}</td>
                        <td className="py-2 px-2 text-right font-mono font-bold">{finalCount}</td>
                        <td className="py-2 px-2 text-right font-mono font-bold">
                          {diff > 0 ? `+${diff}` : diff}
                        </td>
                        <td className="py-2 px-3 text-slate-600 italic">
                          {line.reason || "Penyesuaian hasil audit fisik"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* CATATAN PENUTUP */}
        <p className="text-[11px] text-slate-600 leading-relaxed text-justify">
          Demikian Berita Acara ini disusun secara objektif dan sebenarnya berdasarkan hasil penghitungan fisik di lokasi.
          Seluruh selisih yang tercatat telah disesuaikan pada buku besar persediaan (append-only ledger) melalui pergerakan
          mutasi ADJUST.
        </p>

        {/* 3 KOLOM TANDA TANGAN RESMI */}
        <div className="pt-6 grid grid-cols-3 gap-4 text-center text-xs">
          {/* Kolom 1: Penghitung */}
          <div className="space-y-16">
            <div>
              <span className="text-slate-500 block">Petugas Penghitung Fisik,</span>
              <span className="text-[11px] text-slate-400">Tim Lapangan</span>
            </div>
            <div>
              <div className="font-bold underline text-slate-900">
                {lines.find((l) => l.counter)?.counter?.name || "M. Fazar Maulana (Ajay)"}
              </div>
              <div className="text-[11px] text-slate-500">Petugas Opname</div>
            </div>
          </div>

          {/* Kolom 2: Pengelola Inventaris */}
          <div className="space-y-16">
            <div>
              <span className="text-slate-500 block">Pengelola Inventaris,</span>
              <span className="text-[11px] text-slate-400">HR & General Affairs</span>
            </div>
            <div>
              <div className="font-bold underline text-slate-900">Marsya Aulia R., S.Kep.</div>
              <div className="text-[11px] text-slate-500">HR & GA Officer</div>
            </div>
          </div>

          {/* Kolom 3: Menyetujui Direktur */}
          <div className="space-y-16">
            <div>
              <span className="text-slate-500 block">Mengetahui & Menyetujui,</span>
              <span className="text-[11px] text-slate-400">Direksi Perusahaan</span>
            </div>
            <div>
              <div className="font-bold underline text-slate-900">Habsi Gufira P., S.AP.</div>
              <div className="text-[11px] text-slate-500">Direktur Utama</div>
            </div>
          </div>
        </div>

        {/* PRINT FOOTER */}
        <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
          <span>Dicetak pada: {printDate} &bull; Aksara Stok Opname PWA</span>
          <span>Dokumen Sah PT Aksara Riksa Perdana</span>
        </div>
      </div>
    </div>
  );
}
