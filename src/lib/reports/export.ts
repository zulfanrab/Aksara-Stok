/**
 * Modul Generator Ekspor Laporan (Excel & Word)
 * PT Aksara Riksa Perdana
 * Mengacu pada BLUEPRINT.md Bagian 9 & 15:
 * Brand Color Cetak: #299775, Aksen: #B48A25.
 */

import type { StockSummaryItem, PersonUsageSummary, ProjectUsageSummary } from "@/lib/services/reports";
import { getItemPhotoPublicUrl } from "@/lib/storage";

/**
 * Utilitas untuk memicu unduhan file Blob di peramban
 */
export function downloadFile(content: BlobPart, fileName: string, mimeType: string) {
  if (typeof window === "undefined") return;

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Ekspor Rekapitulasi Stok ke format Excel Spreadsheet
 */
export function exportStockSummaryToExcel(
  items: StockSummaryItem[],
  options?: { generatedBy?: string }
) {
  const dateStr = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const rowsHtml = items
    .map((item, idx) => {
      const statusColor =
        item.status === "AMAN"
          ? "#ecfdf5; color: #047857"
          : item.status === "MENIPIS"
          ? "#fffbeb; color: #b45309"
          : "#fff1f2; color: #be123c";

      const photoUrl = getItemPhotoPublicUrl(item.photo_path);
      const photoCell = photoUrl
        ? `<td style="text-align: center; vertical-align: middle; border: 1px solid #cbd5e1; padding: 4px;">
             <img src="${photoUrl}" width="55" height="55" alt="${item.name}" style="object-fit: cover; border-radius: 4px; display: block; margin: 0 auto;" />
             <a href="${photoUrl}" target="_blank" style="font-size: 8pt; color: #299775; text-decoration: underline; display: block; margin-top: 2px;">Buka Foto</a>
           </td>`
        : `<td style="text-align: center; color: #94a3b8; font-size: 8pt; border: 1px solid #cbd5e1;">-</td>`;

      return `
        <tr>
          <td style="text-align: center; border: 1px solid #cbd5e1; vertical-align: middle;">${idx + 1}</td>
          ${photoCell}
          <td style="font-family: monospace; font-weight: bold; border: 1px solid #cbd5e1; vertical-align: middle;">${item.code}</td>
          <td style="border: 1px solid #cbd5e1; vertical-align: middle;">${item.name}</td>
          <td style="border: 1px solid #cbd5e1; vertical-align: middle;">${item.categoryName}</td>
          <td style="text-align: right; font-weight: bold; border: 1px solid #cbd5e1; vertical-align: middle;">${item.currentStock}</td>
          <td style="border: 1px solid #cbd5e1; vertical-align: middle;">${item.unitName}</td>
          <td style="text-align: right; border: 1px solid #cbd5e1; vertical-align: middle;">${item.minStock}</td>
          <td style="text-align: right; border: 1px solid #cbd5e1; vertical-align: middle;">${item.targetStock}</td>
          <td style="text-align: center; font-weight: bold; background-color: ${statusColor}; border: 1px solid #cbd5e1; vertical-align: middle;">
            ${item.status}
          </td>
        </tr>
      `;
    })
    .join("");

  const tableHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 11pt; }
          .header-title { font-size: 16pt; font-weight: bold; color: #299775; }
          .header-sub { font-size: 10pt; color: #64748b; margin-bottom: 12px; }
          th { background-color: #299775; color: #ffffff; padding: 8px; text-align: left; border: 1px solid #1e6d55; }
          td { padding: 6px 8px; }
        </style>
      </head>
      <body>
        <table>
          <tr>
            <td colspan="10" class="header-title">PT AKSARA RIKSA PERDANA</td>
          </tr>
          <tr>
            <td colspan="10" style="font-size: 13pt; font-weight: bold; color: #1e293b;">LAPORAN REKAPITULASI STOK INVENTARIS</td>
          </tr>
          <tr>
            <td colspan="10" class="header-sub">Tanggal Cetak: ${dateStr} &bull; Pencetak: ${options?.generatedBy || "Admin Gudang"}</td>
          </tr>
          <tr><td></td></tr>
          <thead>
            <tr>
              <th style="text-align: center; width: 40px;">No</th>
              <th style="text-align: center; width: 80px;">Foto</th>
              <th>Kode Barang</th>
              <th>Nama Barang</th>
              <th>Kategori</th>
              <th style="text-align: right;">Stok Terkini</th>
              <th>Satuan</th>
              <th style="text-align: right;">Batas Min</th>
              <th style="text-align: right;">Target</th>
              <th style="text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </body>
    </html>
  `;

  const fileName = `Rekap_Stok_Aksara_${new Date().toISOString().slice(0, 10)}.xls`;
  downloadFile(tableHtml, fileName, "application/vnd.ms-excel;charset=utf-8");
}

/**
 * Ekspor Analisis Pemakaian per Karyawan ke format Excel Spreadsheet
 */
export function exportPersonUsageToExcel(
  summaries: PersonUsageSummary[],
  options?: { generatedBy?: string }
) {
  const dateStr = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const rowsHtml = summaries
    .map((s, idx) => {
      const topItems = s.itemsBreakdown
        .slice(0, 3)
        .map((i) => `${i.itemName} (${i.totalQty} ${i.unitName})`)
        .join("; ");

      return `
        <tr>
          <td style="text-align: center; border: 1px solid #cbd5e1;">${idx + 1}</td>
          <td style="font-family: monospace; border: 1px solid #cbd5e1;">${s.person.employee_code}</td>
          <td style="font-weight: bold; border: 1px solid #cbd5e1;">${s.person.name}</td>
          <td style="border: 1px solid #cbd5e1;">${s.person.position}</td>
          <td style="text-align: right; border: 1px solid #cbd5e1;">${s.totalTransactions} kali</td>
          <td style="text-align: right; font-weight: bold; border: 1px solid #cbd5e1;">${s.totalQuantity} unit</td>
          <td style="font-size: 9pt; color: #475569; border: 1px solid #cbd5e1;">${topItems || "Belum ada transaksi keluar"}</td>
        </tr>
      `;
    })
    .join("");

  const tableHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 11pt; }
          .header-title { font-size: 16pt; font-weight: bold; color: #299775; }
          th { background-color: #299775; color: #ffffff; padding: 8px; text-align: left; border: 1px solid #1e6d55; }
          td { padding: 6px 8px; }
        </style>
      </head>
      <body>
        <table>
          <tr>
            <td colspan="7" class="header-title">PT AKSARA RIKSA PERDANA</td>
          </tr>
          <tr>
            <td colspan="7" style="font-size: 13pt; font-weight: bold; color: #1e293b;">LAPORAN PEMAKAIAN BARANG PER PENGGUNA (13 KARYAWAN)</td>
          </tr>
          <tr>
            <td colspan="7" style="font-size: 10pt; color: #64748b;">Tanggal Cetak: ${dateStr} &bull; Pencetak: ${options?.generatedBy || "Admin Gudang"}</td>
          </tr>
          <tr><td></td></tr>
          <thead>
            <tr>
              <th>No</th>
              <th>Kode Karyawan</th>
              <th>Nama Karyawan</th>
              <th>Jabatan</th>
              <th>Frekuensi Ambil</th>
              <th>Total Kuantitas</th>
              <th>Item Paling Sering Diambil</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </body>
    </html>
  `;

  const fileName = `Pemakaian_Karyawan_Aksara_${new Date().toISOString().slice(0, 10)}.xls`;
  downloadFile(tableHtml, fileName, "application/vnd.ms-excel;charset=utf-8");
}

/**
 * Ekspor Dokumen Resmi ke format Microsoft Word (.doc / .docx compatible HTML)
 */
export function exportReportToWord(options: {
  reportTitle: string;
  tableHeaders: string[];
  tableRows: string[][];
  generatedBy?: string;
  approverName?: string;
}) {
  const dateStr = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const thHtml = options.tableHeaders
    .map(
      (h) =>
        `<th style="background-color: #299775; color: #ffffff; font-weight: bold; padding: 8px; border: 1px solid #1e6d55; text-align: left;">${h}</th>`
    )
    .join("");

  const trHtml = options.tableRows
    .map((row) => {
      const tdHtml = row
        .map(
          (cell) =>
            `<td style="padding: 6px 8px; border: 1px solid #cbd5e1; font-size: 10pt;">${cell}</td>`
        )
        .join("");
      return `<tr>${tdHtml}</tr>`;
    })
    .join("");

  const approver = options.approverName || "Habsi Gufira P., S.AP.";
  const creator = options.generatedBy || "M. Fazar Maulana (Ajay)";

  const wordHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <title>${options.reportTitle}</title>
        <style>
          body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; line-height: 1.4; color: #000000; margin: 20mm; }
          .kop-table { width: 100%; border-bottom: 3px double #299775; margin-bottom: 20px; padding-bottom: 8px; }
          .kop-instansi { font-size: 16pt; font-weight: bold; color: #299775; text-transform: uppercase; letter-spacing: 0.5px; }
          .kop-sub { font-size: 9pt; color: #475569; }
          .report-heading { text-align: center; font-size: 14pt; font-weight: bold; text-decoration: underline; margin-top: 15px; margin-bottom: 4px; }
          .report-meta { text-align: center; font-size: 10pt; color: #64748b; margin-bottom: 25px; }
          .data-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 10pt; }
          .ttd-table { width: 100%; margin-top: 40px; border: none; }
          .ttd-col { width: 50%; text-align: center; font-size: 11pt; }
        </style>
      </head>
      <body>
        <!-- Kop Surat Resmi -->
        <table class="kop-table" border="0">
          <tr>
            <td style="width: 15%; text-align: center;">
              <span style="font-size: 24pt; font-weight: bold; color: #299775;">[ARP]</span>
            </td>
            <td style="width: 85%;">
              <div class="kop-instansi">PT AKSARA RIKSA PERDANA</div>
              <div class="kop-sub">Jasa Pemeriksaan, Pengujian K3, dan Sertifikasi Teknis</div>
              <div class="kop-sub">Sistem Manajemen Inventaris & Mutasi Logistik Persediaan</div>
            </td>
          </tr>
        </table>

        <div class="report-heading">${options.reportTitle.toUpperCase()}</div>
        <div class="report-meta">Tanggal: ${dateStr} &bull; Dicetak oleh: ${creator}</div>

        <!-- Tabel Data -->
        <table class="data-table">
          <thead>
            <tr>
              ${thHtml}
            </tr>
          </thead>
          <tbody>
            ${trHtml}
          </tbody>
        </table>

        <!-- Lembar Pengesahan / Tanda Tangan -->
        <table class="ttd-table" border="0">
          <tr>
            <td class="ttd-col">
              <div>Dibuat oleh,</div>
              <div style="font-weight: bold; margin-top: 5px;">Admin Pengelola Gudang</div>
              <div style="height: 60px;"></div>
              <div style="font-weight: bold; text-decoration: underline;">${creator}</div>
              <div style="font-size: 9pt; color: #64748b;">Technical Administration</div>
            </td>
            <td class="ttd-col">
              <div>Mengetahui & Menyetujui,</div>
              <div style="font-weight: bold; margin-top: 5px;">Direktur PT Aksara Riksa Perdana</div>
              <div style="height: 60px;"></div>
              <div style="font-weight: bold; text-decoration: underline;">${approver}</div>
              <div style="font-size: 9pt; color: #64748b;">Director</div>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const fileName = `${options.reportTitle.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.doc`;
  downloadFile(wordHtml, fileName, "application/msword;charset=utf-8");
}
