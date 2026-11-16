/**
 * Utilitas Penyimpanan Foto & Metadata Berkas
 * PT Aksara Riksa Perdana
 */

/**
 * Menghasilkan struktur path direktori teratur per tahun dan bulan.
 * Format: {folder}/{YYYY}/{MM}/{entityId}.{ext}
 * Contoh: opname/2026/11/line-123e4567.jpg
 */
export function generatePhotoPath(
  folder: "opname" | "receipts" | "assets" | "items",
  entityId: string,
  date: Date = new Date(),
  ext: string = "jpg"
): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const cleanId = entityId.replace(/[^a-zA-Z0-9-_]/g, "");
  return `${folder}/${year}/${month}/${cleanId}.${ext}`;
}

/**
 * Menentukan apakah selisih hasil opname mewajibkan foto bukti.
 * Sesuai Bagian 4.3 & 15 BLUEPRINT.md:
 * - Total nilai selisih >= Rp 100.000
 * - Atau barang bertipe alat ukur / instrumen teknis (INSTRUMENT)
 */
export function isPhotoRequiredForLine(
  discrepancyValue: number,
  itemKind?: string
): boolean {
  if (itemKind === "INSTRUMENT") {
    return Math.abs(discrepancyValue) > 0;
  }
  return Math.abs(discrepancyValue) >= 100000;
}
