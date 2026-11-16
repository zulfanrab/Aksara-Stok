/**
 * Modul Logika Stok Inti - PT Aksara Riksa Perdana
 * Mengikuti BLUEPRINT.md (Bagian 4.3, Bagian 7, Bagian 9, Bagian 15)
 */

export type MovementType = "IN" | "OUT" | "ADJUST" | "REVERSAL";

export interface StockMovementRecord {
  id: string; // UUID v4 dari klien (idempoten)
  item_id: string;
  type: MovementType;
  qty: number; // Satuan dasar. ADJUST dapat bernilai positif/negatif
  location_id?: string | null;
  occurred_at?: string | Date;
}

export type StockStatus = "HABIS" | "MENIPIS" | "AMAN";

export interface UnitConversionRule {
  item_id: string;
  from_unit_id: string;
  to_unit_id: string;
  factor: number; // Misal: 1 Rim = 500 Lembar -> factor = 500
}

export interface StockTakeItemInput {
  item_id: string;
  system_qty: number;
  counted_qty: number;
  recount_qty?: number | null;
  unit_price?: number;
  is_high_value?: boolean; // Barang di atas Rp100.000 per unit atau alat ukur
  custom_tolerance_percent?: number;
  custom_tolerance_units?: number;
}

export interface StockTakeDiscrepancyResult {
  effective_counted_qty: number;
  discrepancy_qty: number; // counted - system
  discrepancy_value: number; // discrepancy_qty * unit_price
  is_within_tolerance: boolean;
  requires_recount: boolean;
  requires_photo: boolean;
  requires_explanation: boolean;
}

/**
 * Membulatkan angka presisi desimal untuk menghindari artifact floating point.
 */
export function roundPrecision(val: number, decimals: number = 4): number {
  return Number(Math.round(Number(val + "e" + decimals)) + "e-" + decimals);
}

/**
 * Menghitung saldo akhir stok dari deretan riwayat stock_movements (Append-Only Ledger).
 * Rumus:
 *   IN      -> +qty
 *   OUT     -> -qty
 *   ADJUST  -> +qty (qty bertanda +/-)
 *   REVERSAL-> -qty (pembalik transaksi)
 */
export function calculateCurrentStock(movements: StockMovementRecord[]): number {
  const total = movements.reduce((acc, mov) => {
    switch (mov.type) {
      case "IN":
        return acc + mov.qty;
      case "OUT":
        return acc - mov.qty;
      case "ADJUST":
        return acc + mov.qty;
      case "REVERSAL":
        return acc - mov.qty;
      default:
        return acc;
    }
  }, 0);

  return roundPrecision(total);
}

/**
 * Menghitung status stok berdasarkan kuantitas saat ini dan batas minimum.
 */
export function evaluateStockStatus(currentQty: number, minStock: number): StockStatus {
  if (currentQty <= 0) {
    return "HABIS";
  }
  if (currentQty <= minStock) {
    return "MENIPIS";
  }
  return "AMAN";
}

/**
 * Konversi kuantitas antar satuan:
 * - toBase: qty kemasan dikali faktor (misal: 3 Pack * 12 = 36 Pcs, atau 2 Rim * 500 = 1000 Lembar)
 * - fromBase: qty dasar dibagi faktor (misal: 1000 Lembar / 500 = 2 Rim)
 */
export function convertUnit(
  qty: number,
  factor: number,
  direction: "toBase" | "fromBase"
): number {
  if (factor <= 0) {
    throw new Error("Faktor konversi satuan harus lebih besar dari 0");
  }
  if (direction === "toBase") {
    return roundPrecision(qty * factor);
  } else {
    return roundPrecision(qty / factor);
  }
}

/**
 * Menghitung selisih fisik vs sistem pada stock opname serta evaluasi toleransi.
 * Sesuai Bagian 4.3 BLUEPRINT.md:
 * - Toleransi default ATK/Kebersihan/Konsumsi: 5% atau 1 unit
 * - Barang bernilai tinggi (> Rp100.000) dan alat ukur: toleransi 0
 * - Ambang foto bukti wajib: nilai total selisih >= Rp100.000
 */
export function calculateStockTakeDiscrepancy(
  input: StockTakeItemInput
): StockTakeDiscrepancyResult {
  const effectiveCount =
    input.recount_qty !== undefined && input.recount_qty !== null
      ? input.recount_qty
      : input.counted_qty;

  const discrepancy_qty = roundPrecision(effectiveCount - input.system_qty);
  const unitPrice = input.unit_price || 0;
  const discrepancy_value = roundPrecision(discrepancy_qty * unitPrice);

  let is_within_tolerance = false;

  if (discrepancy_qty === 0) {
    is_within_tolerance = true;
  } else if (input.is_high_value) {
    // Barang bernilai tinggi atau alat ukur toleransi 0
    is_within_tolerance = false;
  } else {
    const tolPercent = input.custom_tolerance_percent ?? 5; // 5%
    const tolUnits = input.custom_tolerance_units ?? 1; // 1 unit
    const allowedUnitDiff = Math.max(
      tolUnits,
      (input.system_qty * tolPercent) / 100
    );

    is_within_tolerance = Math.abs(discrepancy_qty) <= allowedUnitDiff;
  }

  const requires_recount = !is_within_tolerance;
  const requires_explanation = discrepancy_qty !== 0;
  const requires_photo = Math.abs(discrepancy_value) >= 100000;

  return {
    effective_counted_qty: effectiveCount,
    discrepancy_qty,
    discrepancy_value,
    is_within_tolerance,
    requires_recount,
    requires_photo,
    requires_explanation,
  };
}

/**
 * Verifikasi aturan pemisahan tugas (Separation of Duties):
 * Penghitung dilarang keras menyetujui hitungannya sendiri.
 */
export function validateApproverIsNotCounter(
  approverId: string,
  approverPersonId: string | null | undefined,
  lines: Array<{
    counted_by?: string | null;
    counted_by_person_id?: string | null;
  }>
): { valid: boolean; conflictCount: number; message?: string } {
  if (!approverId) {
    return { valid: false, conflictCount: 0, message: "ID Penyetuju wajib diisi." };
  }

  const conflicts = lines.filter((line) => {
    const directMatch = line.counted_by && line.counted_by === approverId;
    const personMatch =
      approverPersonId &&
      line.counted_by_person_id &&
      line.counted_by_person_id === approverPersonId;
    return directMatch || personMatch;
  });

  if (conflicts.length > 0) {
    return {
      valid: false,
      conflictCount: conflicts.length,
      message: `Penghitung tidak boleh menyetujui hitungannya sendiri. Penyetuju terdaftar sebagai pencatat pada ${conflicts.length} baris opname.`,
    };
  }

  return { valid: true, conflictCount: 0 };
}
