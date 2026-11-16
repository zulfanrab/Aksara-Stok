"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export interface StockOutInput {
  clientUuid: string;
  itemId: string;
  qty: number;
  personId: string;
  projectId?: string | null;
  locationId?: string | null;
  note?: string | null;
  occurredAt?: string;
}

export interface StockInInput {
  clientUuid: string;
  itemId: string;
  qtyBuy: number;
  buyUnitId: string;
  qtyBase: number;
  unitPrice?: number;
  supplier?: string | null;
  invoiceNo?: string | null;
  locationId?: string | null;
  note?: string | null;
  occurredAt?: string;
}

export interface StockReversalInput {
  clientUuid: string;
  originalMovementId: string;
  reason: string;
}

/**
 * Mencatat pengeluaran barang (Catat Keluar)
 * Ledger bersifat append-only: hanya INSERT ke stock_movements
 */
export async function recordStockOutAction(input: StockOutInput) {
  if (!input.clientUuid) {
    return { success: false, error: "UUID klien tidak valid." };
  }
  if (!input.itemId || !input.qty || input.qty <= 0) {
    return { success: false, error: "Barang dan jumlah pengeluaran harus lebih besar dari 0." };
  }
  if (!input.personId) {
    return { success: false, error: "Pemakai barang wajib dipilih dari daftar karyawan." };
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase.from("stock_movements").insert({
    id: input.clientUuid,
    item_id: input.itemId,
    type: "OUT",
    qty: input.qty,
    person_id: input.personId,
    project_id: input.projectId || null,
    location_id: input.locationId || null,
    ref_type: "MANUAL_OUT",
    note: input.note || null,
    occurred_at: input.occurredAt || new Date().toISOString(),
  });

  if (error) {
    console.error("Gagal mencatat pengeluaran stok:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/barang");
  revalidatePath("/riwayat");
  return { success: true, movementId: input.clientUuid };
}

/**
 * Mencatat penerimaan barang (Catat Masuk)
 * Mendukung konversi satuan kemasan dan pencatatan riwayat harga beli
 */
export async function recordStockInAction(input: StockInInput) {
  if (!input.clientUuid) {
    return { success: false, error: "UUID klien tidak valid." };
  }
  if (!input.itemId || !input.qtyBase || input.qtyBase <= 0) {
    return { success: false, error: "Barang dan kuantitas masuk harus lebih besar dari 0." };
  }

  const supabase = createAdminClient();

  // 1. Catat ke stock_movements (Append-Only)
  const { error: movError } = await supabase.from("stock_movements").insert({
    id: input.clientUuid,
    item_id: input.itemId,
    type: "IN",
    qty: input.qtyBase,
    location_id: input.locationId || null,
    ref_type: "PURCHASE",
    note: input.note || (input.supplier ? `Pembelian dari ${input.supplier}` : null),
    occurred_at: input.occurredAt || new Date().toISOString(),
  });

  if (movError) {
    console.error("Gagal mencatat penerimaan stok:", movError);
    return { success: false, error: movError.message };
  }

  // 2. Jika ada harga beli, simpan ke price_history
  if (input.unitPrice && input.unitPrice > 0) {
    // Hitung harga per satuan dasar
    const unitPriceBase = (input.unitPrice * input.qtyBuy) / input.qtyBase;
    await supabase.from("price_history").insert({
      item_id: input.itemId,
      unit_price_base: unitPriceBase,
      source: input.supplier ? `Pembelian dari ${input.supplier}` : "Penerimaan Barang",
      effective_date: (input.occurredAt || new Date().toISOString()).split("T")[0],
    });
  }

  revalidatePath("/");
  revalidatePath("/barang");
  revalidatePath("/riwayat");
  return { success: true, movementId: input.clientUuid };
}

/**
 * Transaksi Pembalik (REVERSAL) untuk koreksi salah catat
 * Dilarang UPDATE/DELETE: transaksi baru bertipe REVERSAL dibuat dengan referensi ref_id
 */
export async function recordStockReversalAction(input: StockReversalInput) {
  if (!input.clientUuid || !input.originalMovementId) {
    return { success: false, error: "ID transaksi awal tidak valid." };
  }
  if (!input.reason || input.reason.trim().length < 3) {
    return { success: false, error: "Alasan koreksi/pembatalan wajib diisi minimal 3 karakter." };
  }

  const supabase = createAdminClient();

  // Ambil transaksi awal
  const { data: original, error: fetchError } = await supabase
    .from("stock_movements")
    .select("*")
    .eq("id", input.originalMovementId)
    .single();

  if (fetchError || !original) {
    return { success: false, error: "Transaksi awal yang akan dikoreksi tidak ditemukan." };
  }

  if (original.type === "REVERSAL") {
    return { success: false, error: "Transaksi pembalik tidak dapat dibalikkan kembali." };
  }

  // Hitung kuantitas pembalik:
  // Rumus saldo: IN (+qty), OUT (-qty), REVERSAL (-qty)
  // Untuk membatalkan IN (+qty): butuh REVERSAL dengan qty positif (+qty) -> net = 0
  // Untuk membatalkan OUT (-qty): butuh REVERSAL dengan qty negatif (-qty) -> -(-qty) = +qty -> net = 0
  const reversalQty = original.type === "OUT" ? -Number(original.qty) : Number(original.qty);

  const { error: insertError } = await supabase.from("stock_movements").insert({
    id: input.clientUuid,
    item_id: original.item_id,
    type: "REVERSAL",
    qty: reversalQty,
    location_id: original.location_id,
    project_id: original.project_id,
    person_id: original.person_id,
    ref_type: "REVERSAL",
    ref_id: original.id,
    note: `Koreksi ${original.type}: ${input.reason.trim()}`,
    occurred_at: new Date().toISOString(),
  });

  if (insertError) {
    console.error("Gagal membuat transaksi pembalik:", insertError);
    return { success: false, error: insertError.message };
  }

  revalidatePath("/");
  revalidatePath("/barang");
  revalidatePath("/riwayat");
  return { success: true, movementId: input.clientUuid };
}
