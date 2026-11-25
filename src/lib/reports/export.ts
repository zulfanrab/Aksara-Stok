/**
 * Modul Generator Ekspor Laporan Resmi (.xlsx & .docx)
 * PT Aksara Riksa Perdana
 * Mengacu pada BLUEPRINT.md Bagian 9 & 15:
 * Brand Color Cetak: #299775, Aksen: #B48A25.
 */

import type {
  StockSummaryItem,
  PersonUsageSummary,
  ProjectUsageSummary,
} from "@/lib/services/reports";
import type { StockMovementWithDetails } from "@/lib/services/inventory";
import { getItemPhotoPublicUrl } from "@/lib/storage";

export interface ExportProgressInfo {
  stage: "IMAGES" | "BUILDING" | "DONE";
  loaded: number;
  total: number;
}

export interface PreparedExportImage {
  base64DataUrl: string;
  uint8Array: Uint8Array;
  extension: "jpeg" | "png";
  docxType: "jpg" | "png";
  displayW: number;
  displayH: number;
}

/**
 * Memicu unduhan berkas Blob di peramban
 */
export function downloadFile(content: BlobPart, fileName: string, mimeType: string) {
  if (typeof window === "undefined") return;

  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Mengambil gambar (URL absolut/relatif), mengubah skala agar proporsional (tidak gepeng/terpotong),
 * serta mengembalikan buffer tajam (2x DPI) siap tanam ke dalam Excel (.xlsx) dan Word (.docx).
 */
async function fetchAndPrepareImage(
  url: string,
  maxDisplayPx: number = 112,
  format: "jpeg" | "png" = "jpeg"
): Promise<PreparedExportImage | null> {
  if (typeof window === "undefined" || !url) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const res = await fetch(url, { mode: "cors", signal: controller.signal });
    if (!res.ok) return null;
    const rawBlob = await res.blob();

    // Decode gambar melalui HTMLImageElement agar kompatibel di semua peramban mobile & desktop
    const objectUrl = URL.createObjectURL(rawBlob);
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.crossOrigin = "anonymous";
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Gagal mendekode gambar"));
      el.src = objectUrl;
    }).finally(() => URL.revokeObjectURL(objectUrl));

    const origW = img.naturalWidth || img.width || maxDisplayPx;
    const origH = img.naturalHeight || img.height || maxDisplayPx;
    const maxOrig = Math.max(origW, origH, 1);

    // Dimensi tampilan fisik di Excel/Word (proporsional)
    const displayScale = maxDisplayPx / maxOrig;
    const displayW = Math.max(24, Math.round(origW * displayScale));
    const displayH = Math.max(24, Math.round(origH * displayScale));

    // Resolusi kanvas 2x agar foto tetap tajam saat di-zoom atau dicetak
    const canvasMaxPx = Math.min(maxOrig, maxDisplayPx * 2);
    const canvasScale = canvasMaxPx / maxOrig;
    const canvasW = Math.max(48, Math.round(origW * canvasScale));
    const canvasH = Math.max(48, Math.round(origH * canvasScale));

    const canvas = document.createElement("canvas");
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    if (format === "jpeg") {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvasW, canvasH);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, canvasW, canvasH);

    const mime = format === "png" ? "image/png" : "image/jpeg";
    const quality = format === "png" ? undefined : 0.86;
    const base64DataUrl = canvas.toDataURL(mime, quality);

    const encodedBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), mime, quality)
    );
    if (!encodedBlob) return null;
    const uint8Array = new Uint8Array(await encodedBlob.arrayBuffer());

    return {
      base64DataUrl,
      uint8Array,
      extension: format,
      docxType: format === "png" ? "png" : "jpg",
      displayW,
      displayH,
    };
  } catch (err) {
    console.warn("Gagal menyiapkan gambar ekspor:", url, err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Mengunduh & menyiapkan sekumpulan URL foto secara paralel terbatasi (batch = 6)
 */
async function prepareImageBatch(
  urls: string[],
  maxDisplayPx: number,
  onProgress?: (info: ExportProgressInfo) => void
): Promise<Map<string, PreparedExportImage>> {
  const uniqueUrls = Array.from(new Set(urls.filter(Boolean)));
  const result = new Map<string, PreparedExportImage>();
  if (uniqueUrls.length === 0) return result;

  let loaded = 0;
  const BATCH_SIZE = 6;

  onProgress?.({ stage: "IMAGES", loaded: 0, total: uniqueUrls.length });

  for (let i = 0; i < uniqueUrls.length; i += BATCH_SIZE) {
    const chunk = uniqueUrls.slice(i, i + BATCH_SIZE);
    const preparedList = await Promise.all(
      chunk.map(async (url) => ({
        url,
        prepared: await fetchAndPrepareImage(url, maxDisplayPx, "jpeg"),
      }))
    );

    for (const entry of preparedList) {
      if (entry.prepared) {
        result.set(entry.url, entry.prepared);
      }
      loaded++;
    }
    onProgress?.({ stage: "IMAGES", loaded, total: uniqueUrls.length });
  }

  return result;
}

async function createExcelWorkbook() {
  const mod = (await import("exceljs")) as any;
  const WorkbookCtor = mod.Workbook || mod.default?.Workbook || mod.default;
  const workbook = new WorkbookCtor() as import("exceljs").Workbook;
  workbook.creator = "Aksara Stok Opname";
  workbook.created = new Date();
  return workbook;
}

function getFormattedDateId() {
  return new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function applyThinBorders(cell: import("exceljs").Cell) {
  cell.border = {
    top: { style: "thin", color: { argb: "FFCBD5E1" } },
    left: { style: "thin", color: { argb: "FFCBD5E1" } },
    bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
    right: { style: "thin", color: { argb: "FFCBD5E1" } },
  };
}

function addExcelCompanyHeader(
  sheet: import("exceljs").Worksheet,
  title: string,
  subtitle: string,
  colCount: number,
  logoImg?: PreparedExportImage | null,
  workbook?: import("exceljs").Workbook
) {
  const lastColLetter = sheet.getColumn(colCount).letter;

  // Baris 1: Nama Perusahaan
  sheet.mergeCells(`A1:${lastColLetter}1`);
  const row1 = sheet.getRow(1);
  row1.height = 28;
  const c1 = sheet.getCell("A1");
  c1.value = "PT AKSARA RIKSA PERDANA";
  c1.font = { name: "Segoe UI", size: 16, bold: true, color: { argb: "FF299775" } };
  c1.alignment = { vertical: "middle", horizontal: logoImg ? "center" : "left" };

  // Baris 2: Judul Laporan
  sheet.mergeCells(`A2:${lastColLetter}2`);
  const row2 = sheet.getRow(2);
  row2.height = 22;
  const c2 = sheet.getCell("A2");
  c2.value = title;
  c2.font = { name: "Segoe UI", size: 12, bold: true, color: { argb: "FF0F172A" } };
  c2.alignment = { vertical: "middle", horizontal: logoImg ? "center" : "left" };

  // Baris 3: Metadata Cetak + Garis Aksen Emas
  sheet.mergeCells(`A3:${lastColLetter}3`);
  const row3 = sheet.getRow(3);
  row3.height = 18;
  const c3 = sheet.getCell("A3");
  c3.value = subtitle;
  c3.font = { name: "Segoe UI", size: 9.5, italic: true, color: { argb: "FF64748B" } };
  c3.alignment = { vertical: "middle", horizontal: logoImg ? "center" : "left" };

  // Garis pemisah aksen emas & emerald
  for (let col = 1; col <= colCount; col++) {
    sheet.getCell(3, col).border = {
      bottom: { style: "medium", color: { argb: "FFB48A25" } },
    };
  }

  // Sisipkan Logo di kiri atas (jika tersedia)
  if (logoImg && workbook) {
    const logoId = workbook.addImage({
      base64: logoImg.base64DataUrl,
      extension: logoImg.extension,
    });
    sheet.addImage(logoId, {
      tl: { col: 0.15, row: 0.15 },
      ext: { width: 52, height: 52 },
      editAs: "oneCell",
    });
  }

  sheet.getRow(4).height = 10;
}

/**
 * Ekspor Rekapitulasi Stok ke format Excel (.xlsx asli) dengan foto tertanam besar (112x112px)
 */
export async function exportStockSummaryToExcel(
  items: StockSummaryItem[],
  options?: {
    generatedBy?: string;
    onProgress?: (info: ExportProgressInfo) => void;
  }
) {
  const dateStr = getFormattedDateId();
  const photoUrls = items
    .map((item) => getItemPhotoPublicUrl(item.photo_path))
    .filter((u): u is string => Boolean(u));

  const [imageMap, logoImg] = await Promise.all([
    prepareImageBatch(photoUrls, 114, options?.onProgress),
    fetchAndPrepareImage("/logo.png", 56, "png"),
  ]);

  options?.onProgress?.({ stage: "BUILDING", loaded: photoUrls.length, total: photoUrls.length });

  const workbook = await createExcelWorkbook();
  const sheet = workbook.addWorksheet("Rekapitulasi Stok", {
    pageSetup: {
      paperSize: 9, // A4
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
    views: [{ state: "frozen", ySplit: 5 }],
  });

  // Definisi lebar kolom (total 13 kolom)
  sheet.columns = [
    { key: "no", width: 6 },
    { key: "foto", width: 20 }, // ~148 px untuk foto besar 114px + margin
    { key: "code", width: 13 },
    { key: "name", width: 34 },
    { key: "category", width: 24 },
    { key: "location", width: 20 },
    { key: "stock", width: 13 },
    { key: "unit", width: 11 },
    { key: "minStock", width: 11 },
    { key: "targetStock", width: 11 },
    { key: "restock", width: 13 },
    { key: "status", width: 13 },
    { key: "photoLink", width: 18 },
  ];

  addExcelCompanyHeader(
    sheet,
    "LAPORAN REKAPITULASI STOK INVENTARIS",
    `Tanggal Cetak: ${dateStr}  •  Pencetak: ${options?.generatedBy || "Admin Gudang"}  •  Total: ${items.length} Barang`,
    13,
    logoImg,
    workbook
  );

  // Header Tabel (Baris 5)
  const headers = [
    "No",
    "Foto Barang",
    "Kode",
    "Nama Barang",
    "Kategori",
    "Lokasi Rak",
    "Stok Terkini",
    "Satuan",
    "Batas Min",
    "Target",
    "Saran Beli",
    "Status",
    "Tautan Foto Asli",
  ];
  const headerRow = sheet.getRow(5);
  headerRow.height = 28;
  headers.forEach((label, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = label;
    cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF299775" } };
    cell.alignment = {
      vertical: "middle",
      horizontal: idx === 0 || idx === 1 || idx === 11 ? "center" : idx >= 6 && idx <= 10 ? "right" : "left",
      wrapText: true,
    };
    cell.border = {
      top: { style: "thin", color: { argb: "FF1E6D55" } },
      bottom: { style: "medium", color: { argb: "FF1E6D55" } },
      left: { style: "thin", color: { argb: "FF1E6D55" } },
      right: { style: "thin", color: { argb: "FF1E6D55" } },
    };
  });

  sheet.autoFilter = "A5:M5";

  // Cache imageId agar gambar dengan URL identik tidak diduplikasi
  const excelImageIdCache = new Map<string, number>();

  // Baris Data
  items.forEach((item, idx) => {
    const rowNum = 6 + idx;
    const row = sheet.getRow(rowNum);
    const photoUrl = getItemPhotoPublicUrl(item.photo_path);
    const preparedImg = photoUrl ? imageMap.get(photoUrl) : undefined;

    // Beri tinggi baris besar (102pt ≈ 136px) agar foto 114px terlihat jelas & lega; baris tanpa foto tetap ringkas (24pt)
    row.height = preparedImg ? 102 : 24;

    const suggestedBuy =
      item.status === "HABIS" || item.status === "MENIPIS"
        ? Math.max(0, (item.targetStock || 0) - Math.max(0, item.currentStock || 0))
        : 0;

    row.getCell(1).value = idx + 1;
    row.getCell(2).value = preparedImg ? "" : photoUrl ? "(Gagal muat foto)" : "-";
    row.getCell(3).value = item.code;
    row.getCell(4).value = item.name;
    row.getCell(5).value = item.categoryName;
    row.getCell(6).value = item.locationName || "-";
    row.getCell(7).value = Number(item.currentStock || 0);
    row.getCell(8).value = item.unitName;
    row.getCell(9).value = Number(item.minStock || 0);
    row.getCell(10).value = Number(item.targetStock || 0);
    row.getCell(11).value = suggestedBuy;
    row.getCell(12).value = item.status;

    const linkCell = row.getCell(13);
    if (photoUrl) {
      linkCell.value = { text: "Buka Foto Asli", hyperlink: photoUrl };
      linkCell.font = { name: "Segoe UI", size: 9, underline: true, color: { argb: "FF299775" } };
    } else {
      linkCell.value = "-";
    }

    const zebraBg = idx % 2 === 1 ? "FFF8FAFC" : "FFFFFFFF";

    for (let col = 1; col <= 13; col++) {
      const cell = row.getCell(col);
      applyThinBorders(cell);
      cell.alignment = {
        vertical: "middle",
        horizontal:
          col === 1 || col === 2 || col === 12 || col === 13
            ? "center"
            : col >= 7 && col <= 11
            ? "right"
            : "left",
        wrapText: true,
      };
      if (col !== 12 && col !== 13) {
        cell.font = {
          name: col === 3 ? "Consolas" : "Segoe UI",
          size: 10,
          bold: col === 3 || col === 7 || (col === 11 && suggestedBuy > 0),
          color: {
            argb:
              col === 3
                ? "FF047857"
                : col === 11 && suggestedBuy > 0
                ? "FFB45309"
                : col === 2 && !preparedImg
                ? "FF94A3B8"
                : "FF0F172A",
          },
        };
      }
      if (col !== 12) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: zebraBg } };
      }
    }

    // Format angka & warna badge Status
    [7, 9, 10, 11].forEach((c) => {
      row.getCell(c).numFmt = "#,##0.##";
    });

    const statusCell = row.getCell(12);
    if (item.status === "AMAN") {
      statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFECFDF5" } };
      statusCell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF047857" } };
    } else if (item.status === "MENIPIS") {
      statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFBEB" } };
      statusCell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFB45309" } };
    } else {
      statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF1F2" } };
      statusCell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFBE123C" } };
    }

    // Tanamkan Foto Asli yang Besar & Proporsional di Kolom B (col index 1)
    if (preparedImg && photoUrl) {
      let imageId = excelImageIdCache.get(photoUrl);
      if (imageId === undefined) {
        imageId = workbook.addImage({
          base64: preparedImg.base64DataUrl,
          extension: preparedImg.extension,
        });
        excelImageIdCache.set(photoUrl, imageId);
      }

      const cellWpx = 148;
      const cellHpx = 136;
      const offsetCol = Math.max(0.04, (cellWpx - preparedImg.displayW) / (2 * cellWpx));
      const offsetRow = Math.max(0.04, (cellHpx - preparedImg.displayH) / (2 * cellHpx));

      sheet.addImage(imageId, {
        tl: { col: 1 + offsetCol, row: rowNum - 1 + offsetRow },
        ext: { width: preparedImg.displayW, height: preparedImg.displayH },
        editAs: "oneCell",
      });
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = `Rekap_Stok_Aksara_${new Date().toISOString().slice(0, 10)}.xlsx`;
  downloadFile(
    buffer as ArrayBuffer,
    fileName,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  options?.onProgress?.({ stage: "DONE", loaded: photoUrls.length, total: photoUrls.length });
}

/**
 * Ekspor Analisis Pemakaian per Karyawan ke format Excel (.xlsx asli)
 */
export async function exportPersonUsageToExcel(
  summaries: PersonUsageSummary[],
  options?: { generatedBy?: string }
) {
  const dateStr = getFormattedDateId();
  const logoImg = await fetchAndPrepareImage("/logo.png", 56, "png");
  const workbook = await createExcelWorkbook();
  const sheet = workbook.addWorksheet("Pemakaian Karyawan", {
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    views: [{ state: "frozen", ySplit: 5 }],
  });

  sheet.columns = [
    { key: "no", width: 6 },
    { key: "nip", width: 16 },
    { key: "name", width: 28 },
    { key: "position", width: 28 },
    { key: "txCount", width: 16 },
    { key: "totalQty", width: 16 },
    { key: "items", width: 52 },
  ];

  addExcelCompanyHeader(
    sheet,
    "LAPORAN PEMAKAIAN BARANG PER KARYAWAN",
    `Tanggal Cetak: ${dateStr}  •  Pencetak: ${options?.generatedBy || "Admin Gudang"}`,
    7,
    logoImg,
    workbook
  );

  const headers = [
    "No",
    "Kode / NIP",
    "Nama Karyawan",
    "Jabatan",
    "Frekuensi Ambil",
    "Total Kuantitas",
    "Rincian Barang yang Diambil",
  ];
  const headerRow = sheet.getRow(5);
  headerRow.height = 26;
  headers.forEach((h, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF299775" } };
    cell.alignment = {
      vertical: "middle",
      horizontal: idx === 0 ? "center" : idx === 4 || idx === 5 ? "right" : "left",
    };
    applyThinBorders(cell);
  });
  sheet.autoFilter = "A5:G5";

  summaries.forEach((s, idx) => {
    const row = sheet.getRow(6 + idx);
    const itemsList = s.itemsBreakdown
      .map((i) => `${i.itemName} (${i.totalQty} ${i.unitName})`)
      .join(", ");

    row.getCell(1).value = idx + 1;
    row.getCell(2).value = s.person.employee_code;
    row.getCell(3).value = s.person.name;
    row.getCell(4).value = s.person.position;
    row.getCell(5).value = s.totalTransactions;
    row.getCell(6).value = s.totalQuantity;
    row.getCell(7).value = itemsList || "Belum ada transaksi keluar";

    row.height = Math.max(22, Math.ceil((itemsList.length || 20) / 50) * 16 + 6);
    for (let col = 1; col <= 7; col++) {
      const cell = row.getCell(col);
      applyThinBorders(cell);
      cell.alignment = {
        vertical: "middle",
        horizontal: col === 1 ? "center" : col === 5 || col === 6 ? "right" : "left",
        wrapText: true,
      };
      cell.font = {
        name: col === 2 ? "Consolas" : "Segoe UI",
        size: 10,
        bold: col === 3 || col === 6,
        color: { argb: "FF0F172A" },
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: idx % 2 === 1 ? "FFF8FAFC" : "FFFFFFFF" },
      };
    }
    row.getCell(5).numFmt = "#,##0\"x\"";
    row.getCell(6).numFmt = "#,##0.##\" unit\"";
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = `Pemakaian_Karyawan_Aksara_${new Date().toISOString().slice(0, 10)}.xlsx`;
  downloadFile(
    buffer as ArrayBuffer,
    fileName,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
}

/**
 * Ekspor Analisis Pemakaian per Proyek ke format Excel (.xlsx asli)
 */
export async function exportProjectUsageToExcel(
  summaries: ProjectUsageSummary[],
  options?: { generatedBy?: string }
) {
  const dateStr = getFormattedDateId();
  const logoImg = await fetchAndPrepareImage("/logo.png", 56, "png");
  const workbook = await createExcelWorkbook();
  const sheet = workbook.addWorksheet("Pemakaian Proyek", {
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    views: [{ state: "frozen", ySplit: 5 }],
  });

  sheet.columns = [
    { key: "no", width: 6 },
    { key: "project", width: 32 },
    { key: "client", width: 26 },
    { key: "txCount", width: 16 },
    { key: "totalQty", width: 16 },
    { key: "items", width: 54 },
  ];

  addExcelCompanyHeader(
    sheet,
    "LAPORAN PEMAKAIAN INVENTARIS PER PROYEK / KLIEN",
    `Tanggal Cetak: ${dateStr}  •  Pencetak: ${options?.generatedBy || "Admin Gudang"}`,
    6,
    logoImg,
    workbook
  );

  const headers = [
    "No",
    "Nama Proyek",
    "Klien",
    "Frekuensi Ambil",
    "Total Barang Keluar",
    "Rincian Barang Terambil",
  ];
  const headerRow = sheet.getRow(5);
  headerRow.height = 26;
  headers.forEach((h, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF299775" } };
    cell.alignment = {
      vertical: "middle",
      horizontal: idx === 0 ? "center" : idx === 3 || idx === 4 ? "right" : "left",
    };
    applyThinBorders(cell);
  });
  sheet.autoFilter = "A5:F5";

  summaries.forEach((p, idx) => {
    const row = sheet.getRow(6 + idx);
    const itemsList = p.itemsBreakdown
      .map((i) => `${i.itemName} (${i.totalQty} ${i.unitName})`)
      .join(", ");

    row.getCell(1).value = idx + 1;
    row.getCell(2).value = p.project.name;
    row.getCell(3).value = p.project.client || "-";
    row.getCell(4).value = p.totalTransactions;
    row.getCell(5).value = p.totalQuantity;
    row.getCell(6).value = itemsList || "Belum ada mutasi proyek";

    row.height = Math.max(22, Math.ceil((itemsList.length || 20) / 52) * 16 + 6);
    for (let col = 1; col <= 6; col++) {
      const cell = row.getCell(col);
      applyThinBorders(cell);
      cell.alignment = {
        vertical: "middle",
        horizontal: col === 1 ? "center" : col === 4 || col === 5 ? "right" : "left",
        wrapText: true,
      };
      cell.font = { name: "Segoe UI", size: 10, bold: col === 2 || col === 5, color: { argb: "FF0F172A" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: idx % 2 === 1 ? "FFF8FAFC" : "FFFFFFFF" },
      };
    }
    row.getCell(4).numFmt = "#,##0\"x\"";
    row.getCell(5).numFmt = "#,##0.##\" unit\"";
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = `Pemakaian_Proyek_Aksara_${new Date().toISOString().slice(0, 10)}.xlsx`;
  downloadFile(
    buffer as ArrayBuffer,
    fileName,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
}

/**
 * Ekspor Riwayat Mutasi Stok ke Excel (.xlsx) untuk Rekonsiliasi & Audit
 */
export async function exportMovementsToExcel(
  movements: StockMovementWithDetails[],
  options?: { generatedBy?: string }
) {
  const dateStr = getFormattedDateId();
  const logoImg = await fetchAndPrepareImage("/logo.png", 56, "png");
  const workbook = await createExcelWorkbook();
  const sheet = workbook.addWorksheet("Riwayat Mutasi", {
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    views: [{ state: "frozen", ySplit: 5 }],
  });

  sheet.columns = [
    { key: "no", width: 6 },
    { key: "date", width: 20 },
    { key: "type", width: 14 },
    { key: "code", width: 12 },
    { key: "item", width: 30 },
    { key: "delta", width: 14 },
    { key: "unit", width: 10 },
    { key: "person", width: 24 },
    { key: "project", width: 22 },
    { key: "note", width: 36 },
  ];

  addExcelCompanyHeader(
    sheet,
    "JURNAL RIWAYAT PERGERAKAN STOK (LEDGER)",
    `Tanggal Cetak: ${dateStr}  •  Pencetak: ${options?.generatedBy || "Admin Gudang"}  •  Total: ${movements.length} Mutasi`,
    10,
    logoImg,
    workbook
  );

  const headers = [
    "No",
    "Waktu Transaksi",
    "Jenis",
    "Kode",
    "Nama Barang",
    "Dampak Stok",
    "Satuan",
    "Karyawan / Supplier",
    "Proyek / Nota",
    "Keterangan",
  ];
  const headerRow = sheet.getRow(5);
  headerRow.height = 26;
  headers.forEach((h, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF299775" } };
    cell.alignment = { vertical: "middle", horizontal: idx === 0 ? "center" : idx === 5 ? "right" : "left" };
    applyThinBorders(cell);
  });
  sheet.autoFilter = "A5:J5";

  movements.forEach((mov, idx) => {
    const row = sheet.getRow(6 + idx);
    const stockDelta =
      mov.type === "IN"
        ? Number(mov.qty)
        : mov.type === "OUT"
        ? -Number(mov.qty)
        : mov.type === "REVERSAL"
        ? -Number(mov.qty)
        : Number(mov.qty);

    const typeLabel =
      mov.type === "IN"
        ? "Masuk"
        : mov.type === "OUT"
        ? "Keluar"
        : mov.type === "REVERSAL"
        ? "Koreksi"
        : "Penyesuaian";

    const dStr = new Date(mov.occurred_at).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    row.getCell(1).value = idx + 1;
    row.getCell(2).value = dStr;
    row.getCell(3).value = typeLabel;
    row.getCell(4).value = mov.item?.code || "-";
    row.getCell(5).value = mov.item?.name || "-";
    row.getCell(6).value = stockDelta;
    row.getCell(7).value = mov.item?.unit?.name || "-";
    row.getCell(8).value = mov.person?.name || mov.purchase?.supplier || "-";
    row.getCell(9).value = mov.project?.name || mov.purchase?.invoice_no || "-";
    row.getCell(10).value = mov.note || "-";

    row.height = 22;
    for (let col = 1; col <= 10; col++) {
      const cell = row.getCell(col);
      applyThinBorders(cell);
      cell.alignment = {
        vertical: "middle",
        horizontal: col === 1 || col === 3 ? "center" : col === 6 ? "right" : "left",
        wrapText: true,
      };
      cell.font = {
        name: col === 4 ? "Consolas" : "Segoe UI",
        size: 10,
        bold: col === 4 || col === 6,
        color: {
          argb:
            col === 6
              ? stockDelta >= 0
                ? "FF047857"
                : "FFBE123C"
              : "FF0F172A",
        },
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: idx % 2 === 1 ? "FFF8FAFC" : "FFFFFFFF" },
      };
    }
    row.getCell(6).numFmt = "+#,##0.##;-#,##0.##;0";
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = `Riwayat_Mutasi_Aksara_${new Date().toISOString().slice(0, 10)}.xlsx`;
  downloadFile(
    buffer as ArrayBuffer,
    fileName,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
}

/**
 * Ekspor Rekapitulasi Stok ke format Microsoft Word (.docx asli) dengan foto tertanam besar & rapi
 */
export async function exportStockSummaryToWord(
  items: StockSummaryItem[],
  options?: {
    generatedBy?: string;
    approverName?: string;
    onProgress?: (info: ExportProgressInfo) => void;
  }
) {
  const photoUrls = items
    .map((i) => getItemPhotoPublicUrl(i.photo_path))
    .filter((u): u is string => Boolean(u));

  const [imageMap, logoImg] = await Promise.all([
    prepareImageBatch(photoUrls, 108, options?.onProgress),
    fetchAndPrepareImage("/logo.png", 58, "png"),
  ]);

  options?.onProgress?.({ stage: "BUILDING", loaded: photoUrls.length, total: photoUrls.length });

  const tableRows: WordTableCellInput[][] = items.map((item, idx) => {
    const photoUrl = getItemPhotoPublicUrl(item.photo_path);
    const prepared = photoUrl ? imageMap.get(photoUrl) : undefined;
    return [
      { text: String(idx + 1), align: "center" },
      {
        text: prepared ? "" : "-",
        image: prepared,
        linkUrl: photoUrl || undefined,
        align: "center",
      },
      { text: item.code, bold: true },
      { text: item.name, bold: true },
      { text: item.categoryName },
      { text: String(item.currentStock), align: "right", bold: true },
      { text: item.unitName, align: "center" },
      {
        text: item.status,
        align: "center",
        bold: true,
        color:
          item.status === "AMAN"
            ? "047857"
            : item.status === "MENIPIS"
            ? "B45309"
            : "BE123C",
      },
    ];
  });

  await buildAndDownloadDocx({
    reportTitle: "Laporan Rekapitulasi Stok Inventaris",
    headers: ["No", "Foto Barang", "Kode", "Nama Barang", "Kategori", "Stok", "Satuan", "Status"],
    colWidthsDxa: [520, 1950, 1050, 2650, 1580, 780, 750, 826], // Total = 10106 twips (A4)
    rows: tableRows,
    generatedBy: options?.generatedBy,
    approverName: options?.approverName,
    logoImg,
  });

  options?.onProgress?.({ stage: "DONE", loaded: photoUrls.length, total: photoUrls.length });
}

export interface WordTableCellInput {
  text: string;
  align?: "left" | "center" | "right";
  bold?: boolean;
  color?: string;
  image?: PreparedExportImage;
  linkUrl?: string;
}

/**
 * Ekspor Dokumen Resmi ke format Microsoft Word (.docx asli)
 */
export async function exportReportToWord(options: {
  reportTitle: string;
  tableHeaders: string[];
  tableRows: string[][];
  colWidthsDxa?: number[];
  generatedBy?: string;
  approverName?: string;
  onProgress?: (info: ExportProgressInfo) => void;
}) {
  options.onProgress?.({ stage: "BUILDING", loaded: 0, total: 0 });
  const logoImg = await fetchAndPrepareImage("/logo.png", 58, "png");

  const colCount = options.tableHeaders.length;
  const totalWidthDxa = 10106;
  const defaultWidths =
    options.colWidthsDxa ||
    Array.from({ length: colCount }, (_, i) =>
      i === 0 ? 550 : Math.floor((totalWidthDxa - 550) / Math.max(1, colCount - 1))
    );

  const structuredRows: WordTableCellInput[][] = options.tableRows.map((row) =>
    row.map((cell, idx) => ({
      text: cell,
      align: idx === 0 ? "center" : "left",
    }))
  );

  await buildAndDownloadDocx({
    reportTitle: options.reportTitle,
    headers: options.tableHeaders,
    colWidthsDxa: defaultWidths,
    rows: structuredRows,
    generatedBy: options.generatedBy,
    approverName: options.approverName,
    logoImg,
  });
  options.onProgress?.({ stage: "DONE", loaded: 0, total: 0 });
}

async function buildAndDownloadDocx(params: {
  reportTitle: string;
  headers: string[];
  colWidthsDxa: number[];
  rows: WordTableCellInput[][];
  generatedBy?: string;
  approverName?: string;
  logoImg?: PreparedExportImage | null;
}) {
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    Table,
    TableRow,
    TableCell,
    ImageRun,
    ExternalHyperlink,
    WidthType,
    AlignmentType,
    BorderStyle,
    ShadingType,
    VerticalAlign,
    TableLayoutType,
  } = await import("docx");

  const dateStr = getFormattedDateId();
  const approver = params.approverName || "Habsi Gufira P., S.AP.";
  const creator = params.generatedBy || "M. Fazar Maulana (Ajay)";

  const toAlign = (a?: "left" | "center" | "right") =>
    a === "center"
      ? AlignmentType.CENTER
      : a === "right"
      ? AlignmentType.RIGHT
      : AlignmentType.LEFT;

  const thinBorder = { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1" };
  const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };

  // Kop Surat
  const kopTable = new Table({
    width: { size: 10106, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    borders: {
      top: noBorder,
      left: noBorder,
      right: noBorder,
      insideHorizontal: noBorder,
      insideVertical: noBorder,
      bottom: { style: BorderStyle.DOUBLE, size: 12, color: "299775" },
    },
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: 1300, type: WidthType.DXA },
            verticalAlign: VerticalAlign.CENTER,
            borders: { top: noBorder, left: noBorder, right: noBorder, bottom: noBorder },
            children: [
              params.logoImg
                ? new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new ImageRun({
                        type: params.logoImg.docxType,
                        data: params.logoImg.uint8Array,
                        transformation: {
                          width: params.logoImg.displayW,
                          height: params.logoImg.displayH,
                        },
                      }),
                    ],
                  })
                : new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({ text: "[ARP]", bold: true, size: 32, color: "299775" }),
                    ],
                  }),
            ],
          }),
          new TableCell({
            width: { size: 8806, type: WidthType.DXA },
            verticalAlign: VerticalAlign.CENTER,
            borders: { top: noBorder, left: noBorder, right: noBorder, bottom: noBorder },
            children: [
              new Paragraph({
                spacing: { after: 40 },
                children: [
                  new TextRun({
                    text: "PT AKSARA RIKSA PERDANA",
                    bold: true,
                    size: 28,
                    color: "299775",
                  }),
                ],
              }),
              new Paragraph({
                spacing: { after: 20 },
                children: [
                  new TextRun({
                    text: "Jasa Pemeriksaan, Pengujian K3, dan Sertifikasi Teknis",
                    size: 18,
                    color: "475569",
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Sistem Manajemen Inventaris & Mutasi Logistik Persediaan",
                    size: 16,
                    color: "B48A25",
                    bold: true,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // Header Data Table
  const headerTableRow = new TableRow({
    tableHeader: true,
    cantSplit: true,
    children: params.headers.map(
      (header, idx) =>
        new TableCell({
          width: { size: params.colWidthsDxa[idx] || 1000, type: WidthType.DXA },
          verticalAlign: VerticalAlign.CENTER,
          shading: { type: ShadingType.CLEAR, fill: "299775", color: "auto" },
          margins: { top: 100, bottom: 100, left: 90, right: 90 },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 6, color: "1E6D55" },
            bottom: { style: BorderStyle.SINGLE, size: 6, color: "1E6D55" },
            left: { style: BorderStyle.SINGLE, size: 4, color: "1E6D55" },
            right: { style: BorderStyle.SINGLE, size: 4, color: "1E6D55" },
          },
          children: [
            new Paragraph({
              alignment: idx <= 1 ? AlignmentType.CENTER : AlignmentType.LEFT,
              children: [
                new TextRun({
                  text: header,
                  bold: true,
                  size: 18,
                  color: "FFFFFF",
                }),
              ],
            }),
          ],
        })
    ),
  });

  // Data Rows (CantSplit agar gambar tidak terbelah saat pindah halaman!)
  const bodyRows = params.rows.map(
    (row, rowIdx) =>
      new TableRow({
        cantSplit: true,
        children: row.map((cell, colIdx) => {
          const childrenParagraphs: InstanceType<typeof Paragraph>[] = [];

          if (cell.image) {
            childrenParagraphs.push(
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 40, after: cell.linkUrl ? 40 : 40 },
                children: [
                  new ImageRun({
                    type: cell.image.docxType,
                    data: cell.image.uint8Array,
                    transformation: {
                      width: cell.image.displayW,
                      height: cell.image.displayH,
                    },
                  }),
                ],
              })
            );
            if (cell.linkUrl) {
              childrenParagraphs.push(
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new ExternalHyperlink({
                      link: cell.linkUrl,
                      children: [
                        new TextRun({
                          text: "Buka Asli",
                          style: "Hyperlink",
                          size: 14,
                          color: "299775",
                          underline: {},
                        }),
                      ],
                    }),
                  ],
                })
              );
            }
          } else {
            childrenParagraphs.push(
              new Paragraph({
                alignment: toAlign(cell.align),
                children: [
                  new TextRun({
                    text: cell.text || "-",
                    bold: Boolean(cell.bold),
                    size: 18,
                    color: cell.color || "0F172A",
                  }),
                ],
              })
            );
          }

          return new TableCell({
            width: { size: params.colWidthsDxa[colIdx] || 1000, type: WidthType.DXA },
            verticalAlign: VerticalAlign.CENTER,
            shading:
              rowIdx % 2 === 1
                ? { type: ShadingType.CLEAR, fill: "F8FAFC", color: "auto" }
                : undefined,
            margins: { top: 80, bottom: 80, left: 90, right: 90 },
            borders: {
              top: thinBorder,
              bottom: thinBorder,
              left: thinBorder,
              right: thinBorder,
            },
            children: childrenParagraphs,
          });
        }),
      })
  );

  const dataTable = new Table({
    width: { size: 10106, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    rows: [headerTableRow, ...bodyRows],
  });

  // Tabel Tanda Tangan Resmi
  const signatureTable = new Table({
    width: { size: 10106, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    borders: {
      top: noBorder,
      bottom: noBorder,
      left: noBorder,
      right: noBorder,
      insideHorizontal: noBorder,
      insideVertical: noBorder,
    },
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: 5053, type: WidthType.DXA },
            borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "Dibuat oleh,", size: 18, color: "64748B" })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 720 },
                children: [new TextRun({ text: "Admin Pengelola Gudang", bold: true, size: 18 })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: creator, bold: true, underline: {}, size: 19 })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "Technical Administration", size: 16, color: "64748B" })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 5053, type: WidthType.DXA },
            borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "Mengetahui & Menyetujui,", size: 18, color: "64748B" })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 720 },
                children: [new TextRun({ text: "Direktur PT Aksara Riksa Perdana", bold: true, size: 18 })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: approver, bold: true, underline: {}, size: 19 })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "Director", size: 16, color: "64748B" })],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const doc = new Document({
    creator: "Aksara Stok Opname",
    title: params.reportTitle,
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 }, // A4 Portrait
            margin: { top: 850, bottom: 850, left: 900, right: 900 },
          },
        },
        children: [
          kopTable,
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 260, after: 60 },
            children: [
              new TextRun({
                text: params.reportTitle.toUpperCase(),
                bold: true,
                size: 24,
                underline: {},
                color: "0F172A",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 220 },
            children: [
              new TextRun({
                text: `Tanggal: ${dateStr}  •  Dicetak oleh: ${creator}`,
                size: 17,
                color: "64748B",
              }),
            ],
          }),
          dataTable,
          new Paragraph({ spacing: { before: 360 }, children: [] }),
          signatureTable,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const fileName = `${params.reportTitle.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.docx`;
  downloadFile(
    blob,
    fileName,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
}
