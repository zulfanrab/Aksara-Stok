"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateNextItemCode, findSimilarItems } from "@/lib/stock-logic";

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
  receiptPath?: string | null;
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

  // 3. Catat di tabel purchases jika ada supplier, invoice, atau foto nota
  if (input.supplier || input.invoiceNo || input.receiptPath) {
    await supabase.from("purchases").insert({
      supplier: input.supplier || "Supplier Umum",
      invoice_no: input.invoiceNo || null,
      receipt_path: input.receiptPath || null,
      purchased_at: (input.occurredAt || new Date().toISOString()).split("T")[0],
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

export interface CreateItemInput {
  name: string;
  categoryCode: string;
  baseUnitName: string;
  minStock?: number;
  targetStock?: number;
  kind?: "CONSUMABLE" | "PPE" | "INSTRUMENT" | "SERVICE";
}

/**
 * Tambah Master Barang Baru (Hanya Admin)
 * 1. Prefix dipilih dari kategori (ATK, APD, ALT, BHN, KBR, KNS, IT)
 * 2. Kode otomatis = max(angka) + 1, format PREFIX-NNN
 * 3. Memperhitungkan barang nonaktif agar nomor tidak kembar
 * 4. Penanganan tabrakan konkurensi (retry loop 3x)
 * 5. Merekam ke audit_log
 */
export async function createItemAction(input: CreateItemInput): Promise<{
  success: boolean;
  error?: string;
  item?: { id: string; code: string; name: string };
}> {
  const supabase = createAdminClient();

  if (!input.name || !input.name.trim()) {
    return { success: false, error: "Nama barang wajib diisi." };
  }
  if (!input.categoryCode) {
    return { success: false, error: "Pilih kategori barang." };
  }
  if (!input.baseUnitName) {
    return { success: false, error: "Pilih satuan barang." };
  }

  // 1. Cek atau buat kategori (terutama jika kategori baru IT)
  let { data: cat } = await supabase
    .from("categories")
    .select("id, code, name, kind")
    .eq("code", input.categoryCode)
    .maybeSingle();

  if (!cat && input.categoryCode === "IT") {
    const { data: newCat, error: catErr } = await supabase
      .from("categories")
      .insert({
        code: "IT",
        name: "Peralatan IT & Multimedia",
        kind: "INSTRUMENT",
      })
      .select("id, code, name, kind")
      .single();
    if (catErr) {
      return { success: false, error: "Gagal membuat kategori IT: " + catErr.message };
    }
    cat = newCat;
  }

  if (!cat) {
    return { success: false, error: "Kategori tidak ditemukan." };
  }

  // 2. Cek atau buat satuan
  let { data: unit } = await supabase
    .from("units")
    .select("id, name")
    .ilike("name", input.baseUnitName.trim())
    .maybeSingle();

  if (!unit) {
    const { data: newUnit, error: unitErr } = await supabase
      .from("units")
      .insert({ name: input.baseUnitName.trim() })
      .select("id, name")
      .single();
    if (unitErr) {
      return { success: false, error: "Gagal membuat satuan baru: " + unitErr.message };
    }
    unit = newUnit;
  }

  // 3. Default lokasi
  const { data: locs } = await supabase.from("locations").select("id").limit(1);
  const defaultLocationId = locs && locs[0] ? locs[0].id : null;

  // 4. Retry loop untuk konkurensi (hingga 3x jika terjadi unique constraint conflict)
  const prefix = cat.code;
  let attempts = 0;
  let newItem: { id: string; code: string; name: string } | null = null;
  let finalCode = "";

  while (attempts < 3) {
    attempts++;

    // Ambil seluruh kode dengan prefix ini, termasuk barang nonaktif
    const { data: existingItems } = await supabase
      .from("items")
      .select("code")
      .ilike("code", `${prefix}-%`);

    const existingCodes = (existingItems || []).map((i) => i.code);
    finalCode = generateNextItemCode(prefix, existingCodes);

    // Simpan master barang baru
    const { data: inserted, error: itemErr } = await supabase
      .from("items")
      .insert({
        code: finalCode,
        name: input.name.trim(),
        category_id: cat.id,
        kind: input.kind || cat.kind,
        base_unit_id: unit.id,
        min_stock: input.minStock !== undefined ? Number(input.minStock) : 1,
        target_stock: input.targetStock !== undefined ? Number(input.targetStock) : Number(input.minStock || 1) * 2,
        default_location_id: defaultLocationId,
        has_expiry: false,
        is_active: true,
      })
      .select("id, code, name")
      .single();

    if (!itemErr && inserted) {
      newItem = inserted;
      break;
    }

    // Jika terjadi benturan unique constraint, tunggu sesaat lalu ulangi
    if (
      itemErr &&
      (itemErr.code === "23505" ||
        itemErr.message.toLowerCase().includes("unique") ||
        itemErr.message.toLowerCase().includes("duplicate"))
    ) {
      await new Promise((resolve) => setTimeout(resolve, 50 * attempts));
      continue;
    }

    return { success: false, error: itemErr ? itemErr.message : "Gagal menambah master barang." };
  }

  if (!newItem) {
    return { success: false, error: "Gagal membuat nomor barang unik setelah 3 kali percobaan. Silakan coba lagi." };
  }

  // 5. Catat audit_log
  try {
    await supabase.from("audit_log").insert({
      entity: "items",
      entity_id: newItem.id,
      action: "CREATE",
      diff: {
        code: { new: finalCode },
        name: { new: input.name.trim() },
        category_id: { new: cat.id },
        base_unit_id: { new: unit.id },
        min_stock: { new: Number(input.minStock || 1) },
        is_active: { new: true },
      },
    });
  } catch (err) {
    console.warn("Gagal mencatat audit log:", err);
  }

  revalidatePath("/barang");
  revalidatePath("/");
  revalidatePath("/keluar");
  revalidatePath("/masuk");
  revalidatePath("/opname");

  return { success: true, item: newItem };
}

export interface UpdateItemInput {
  itemId: string;
  name: string;
  categoryCode: string;
  minStock: number;
  targetStock?: number;
  defaultLocationId?: string | null;
  code?: string;
  baseUnitName?: string;
}

/**
 * Ubah Master Barang (Hanya Admin)
 * 1. nama, kategori, min_stock, lokasi boleh diubah kapan saja.
 * 2. satuan dan kode DIKUNCI jika barang sudah memiliki transaksi di stock_movements.
 * 3. jika belum punya transaksi, admin boleh mengubah kode/satuan dengan konfirmasi.
 * 4. perubahan dicatat di audit_log.
 */
export async function updateItemAction(input: UpdateItemInput): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = createAdminClient();

  if (!input.itemId) {
    return { success: false, error: "ID barang tidak valid." };
  }
  if (!input.name || !input.name.trim()) {
    return { success: false, error: "Nama barang wajib diisi." };
  }

  // 1. Ambil data lama barang
  const { data: oldItem, error: fetchErr } = await supabase
    .from("items")
    .select("*, category:categories(code), unit:units(name)")
    .eq("id", input.itemId)
    .single();

  if (fetchErr || !oldItem) {
    return { success: false, error: "Barang tidak ditemukan." };
  }

  // 2. Cek apakah barang memiliki transaksi di stock_movements
  const { count: txCount } = await supabase
    .from("stock_movements")
    .select("id", { count: "exact", head: true })
    .eq("item_id", input.itemId);

  const hasTransactions = (txCount || 0) > 0;

  // 3. Validasi penguncian kode dan satuan dasar jika sudah ada transaksi
  if (hasTransactions) {
    if (input.code && input.code.trim().toUpperCase() !== oldItem.code) {
      return {
        success: false,
        error: `Barang ${oldItem.code} sudah memiliki riwayat mutasi stok. Kode barang dikunci dan tidak boleh diubah.`,
      };
    }
    if (
      input.baseUnitName &&
      oldItem.unit &&
      input.baseUnitName.trim().toLowerCase() !== oldItem.unit.name.trim().toLowerCase()
    ) {
      return {
        success: false,
        error: `Barang ${oldItem.code} sudah memiliki riwayat mutasi stok. Satuan dasar barang dikunci dan tidak boleh diubah.`,
      };
    }
  }

  // 4. Kategori
  let categoryId = oldItem.category_id;
  if (input.categoryCode && input.categoryCode !== oldItem.category?.code) {
    const { data: newCat } = await supabase
      .from("categories")
      .select("id")
      .eq("code", input.categoryCode)
      .maybeSingle();
    if (newCat) categoryId = newCat.id;
  }

  // 5. Satuan (hanya jika belum ada transaksi dan diberikan nama baru)
  let baseUnitId = oldItem.base_unit_id;
  if (!hasTransactions && input.baseUnitName && input.baseUnitName.trim()) {
    let { data: unit } = await supabase
      .from("units")
      .select("id")
      .ilike("name", input.baseUnitName.trim())
      .maybeSingle();

    if (!unit) {
      const { data: newUnit } = await supabase
        .from("units")
        .insert({ name: input.baseUnitName.trim() })
        .select("id")
        .single();
      if (newUnit) baseUnitId = newUnit.id;
    } else {
      baseUnitId = unit.id;
    }
  }

  // 6. Kode baru (hanya jika belum ada transaksi dan diberikan kode baru yang valid)
  let finalCode = oldItem.code;
  if (!hasTransactions && input.code && input.code.trim().toUpperCase() !== oldItem.code) {
    const newCodeCandidate = input.code.trim().toUpperCase();
    // Cek duplikasi
    const { data: existingCode } = await supabase
      .from("items")
      .select("id")
      .eq("code", newCodeCandidate)
      .neq("id", input.itemId)
      .maybeSingle();

    if (existingCode) {
      return { success: false, error: `Kode barang ${newCodeCandidate} sudah dipakai barang lain.` };
    }
    finalCode = newCodeCandidate;
  }

  // 7. Hitung diff untuk audit_log
  const diff: Record<string, { old: any; new: any }> = {};
  if (oldItem.name !== input.name.trim()) {
    diff.name = { old: oldItem.name, new: input.name.trim() };
  }
  if (oldItem.min_stock !== Number(input.minStock)) {
    diff.min_stock = { old: oldItem.min_stock, new: Number(input.minStock) };
  }
  if (oldItem.category_id !== categoryId) {
    diff.category_id = { old: oldItem.category_id, new: categoryId };
  }
  if (oldItem.base_unit_id !== baseUnitId) {
    diff.base_unit_id = { old: oldItem.base_unit_id, new: baseUnitId };
  }
  if (oldItem.code !== finalCode) {
    diff.code = { old: oldItem.code, new: finalCode };
  }
  if (input.defaultLocationId && oldItem.default_location_id !== input.defaultLocationId) {
    diff.default_location_id = { old: oldItem.default_location_id, new: input.defaultLocationId };
  }

  // 8. Eksekusi Update
  const { error: updateErr } = await supabase
    .from("items")
    .update({
      name: input.name.trim(),
      category_id: categoryId,
      base_unit_id: baseUnitId,
      code: finalCode,
      min_stock: Number(input.minStock || 0),
      target_stock: input.targetStock !== undefined ? Number(input.targetStock) : Number(input.minStock || 0) * 2,
      default_location_id: input.defaultLocationId || oldItem.default_location_id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.itemId);

  if (updateErr) {
    return { success: false, error: updateErr.message };
  }

  // 9. Simpan ke audit_log
  if (Object.keys(diff).length > 0) {
    try {
      await supabase.from("audit_log").insert({
        entity: "items",
        entity_id: input.itemId,
        action: "UPDATE",
        diff,
      });
    } catch (err) {
      console.warn("Gagal mencatat audit log:", err);
    }
  }

  revalidatePath("/barang");
  revalidatePath("/");
  revalidatePath("/keluar");
  revalidatePath("/masuk");
  revalidatePath("/opname");

  return { success: true };
}

/**
 * Nonaktifkan atau Aktifkan Kembali Master Barang (Hanya Admin)
 * 1. Tidak menghapus fisik (soft-delete).
 * 2. Mengubah nilai kolom is_active.
 * 3. Kodenya tetap terpakai di database dan tidak boleh dipakai ulang.
 * 4. Merekam ke audit_log.
 */
export async function toggleItemActiveAction(
  itemId: string,
  isActive: boolean
): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = createAdminClient();

  const { data: oldItem, error: fetchErr } = await supabase
    .from("items")
    .select("id, code, name, is_active")
    .eq("id", itemId)
    .single();

  if (fetchErr || !oldItem) {
    return { success: false, error: "Barang tidak ditemukan." };
  }

  const { error: updateErr } = await supabase
    .from("items")
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", itemId);

  if (updateErr) {
    return { success: false, error: updateErr.message };
  }

  // Simpan ke audit_log
  try {
    await supabase.from("audit_log").insert({
      entity: "items",
      entity_id: itemId,
      action: isActive ? "ACTIVATE" : "DEACTIVATE",
      diff: { is_active: { old: oldItem.is_active, new: isActive } },
    });
  } catch (err) {
    console.warn("Gagal mencatat audit log:", err);
  }

  revalidatePath("/barang");
  revalidatePath("/");
  revalidatePath("/keluar");
  revalidatePath("/masuk");
  revalidatePath("/opname");

  return { success: true };
}

/**
 * Cek apakah barang sudah memiliki transaksi di stock_movements
 */
export async function checkItemTransactionsAction(itemId: string): Promise<{
  hasTransactions: boolean;
  transactionCount: number;
}> {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("stock_movements")
    .select("id", { count: "exact", head: true })
    .eq("item_id", itemId);

  return {
    hasTransactions: (count || 0) > 0,
    transactionCount: count || 0,
  };
}
