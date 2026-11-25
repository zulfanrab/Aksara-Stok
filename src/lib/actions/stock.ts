"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  generateNextItemCode,
  findSimilarItems,
  calculateResequencedCodes,
} from "@/lib/stock-logic";

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

function revalidateInventoryRoutes() {
  revalidatePath("/");
  revalidatePath("/barang");
  revalidatePath("/keluar");
  revalidatePath("/masuk");
  revalidatePath("/riwayat");
  revalidatePath("/laporan");
  revalidatePath("/laporan/cetak");
  revalidatePath("/karyawan");
  revalidatePath("/opname");
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

  const { error } = await supabase.from("stock_movements").insert({
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
    // Idempotensi klien: jika UUID mutasi offline sudah tercatat sebelumnya, anggap sukses
    if (error.code === "23505") {
      revalidateInventoryRoutes();
      return { success: true, movementId: input.clientUuid, deduplicated: true };
    }
    console.error("Gagal mencatat pengeluaran stok:", error);
    return { success: false, error: error.message };
  }

  revalidateInventoryRoutes();
  return { success: true, movementId: input.clientUuid };
}

/**
 * Mencatat penerimaan barang (Catat Masuk)
 * Mendukung konversi satuan kemasan, tautan purchases/nota, dan riwayat harga beli
 */
export async function recordStockInAction(input: StockInInput) {
  if (!input.clientUuid) {
    return { success: false, error: "UUID klien tidak valid." };
  }
  if (!input.itemId || !input.qtyBase || input.qtyBase <= 0) {
    return { success: false, error: "Barang dan kuantitas masuk harus lebih besar dari 0." };
  }

  const supabase = createAdminClient();
  const occurredIso = input.occurredAt || new Date().toISOString();

  // Cek idempotensi UUID terlebih dahulu agar tidak menduplikasi tabel purchases/price_history
  const { data: existingMov } = await supabase
    .from("stock_movements")
    .select("id")
    .eq("id", input.clientUuid)
    .maybeSingle();

  if (existingMov) {
    revalidateInventoryRoutes();
    return { success: true, movementId: input.clientUuid, deduplicated: true };
  }

  // 1. Catat di tabel purchases & purchase_lines terlebih dahulu jika ada supplier, invoice, foto nota, atau harga
  let purchaseId: string | null = null;
  if (input.supplier || input.invoiceNo || input.receiptPath || (input.unitPrice && input.unitPrice > 0)) {
    const { data: purchaseRow } = await supabase
      .from("purchases")
      .insert({
        supplier: input.supplier || "Supplier Umum",
        invoice_no: input.invoiceNo || null,
        receipt_path: input.receiptPath || null,
        purchased_at: occurredIso.split("T")[0],
      })
      .select("id")
      .single();

    if (purchaseRow?.id) {
      purchaseId = purchaseRow.id;
      const safeBuyQty = input.qtyBuy > 0 ? input.qtyBuy : input.qtyBase;
      await supabase.from("purchase_lines").insert({
        purchase_id: purchaseId,
        item_id: input.itemId,
        qty_buy: safeBuyQty,
        buy_unit_id: input.buyUnitId,
        qty_base: input.qtyBase,
        unit_price: input.unitPrice && input.unitPrice > 0 ? input.unitPrice : 0,
      });
    }
  }

  // 2. Catat ke stock_movements (Append-Only) dengan ref_id menunjuk ke purchases
  const { error: movError } = await supabase.from("stock_movements").insert({
    id: input.clientUuid,
    item_id: input.itemId,
    type: "IN",
    qty: input.qtyBase,
    location_id: input.locationId || null,
    ref_type: "PURCHASE",
    ref_id: purchaseId,
    note: input.note || (input.supplier ? `Pembelian dari ${input.supplier}` : null),
    occurred_at: occurredIso,
  });

  if (movError) {
    if (movError.code === "23505") {
      revalidateInventoryRoutes();
      return { success: true, movementId: input.clientUuid, deduplicated: true };
    }
    console.error("Gagal mencatat penerimaan stok:", movError);
    return { success: false, error: movError.message };
  }

  // 3. Jika ada harga beli, simpan ke price_history
  if (input.unitPrice && input.unitPrice > 0) {
    const safeBuyQty = input.qtyBuy > 0 ? input.qtyBuy : input.qtyBase;
    const unitPriceBase = (input.unitPrice * safeBuyQty) / input.qtyBase;
    await supabase.from("price_history").insert({
      item_id: input.itemId,
      unit_price_base: unitPriceBase,
      source: input.supplier ? `Pembelian dari ${input.supplier}` : "Penerimaan Barang",
      effective_date: occurredIso.split("T")[0],
    });
  }

  revalidateInventoryRoutes();
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

  // Cegah koreksi ganda pada transaksi yang sudah pernah dibalikkan
  const { data: existingReversal } = await supabase
    .from("stock_movements")
    .select("id")
    .eq("type", "REVERSAL")
    .eq("ref_id", original.id)
    .maybeSingle();

  if (existingReversal) {
    return {
      success: false,
      error: "Transaksi ini sudah pernah dikoreksi/dibalikkan sebelumnya.",
    };
  }

  // Hitung kuantitas pembalik:
  // Rumus saldo: IN (+qty), OUT (-qty), ADJUST (+qty), REVERSAL (-qty)
  // Untuk membatalkan IN (+qty) / ADJUST (+qty): butuh REVERSAL dengan qty positif (+qty) -> net = 0
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
    if (insertError.code === "23505") {
      revalidateInventoryRoutes();
      return { success: true, movementId: input.clientUuid };
    }
    console.error("Gagal membuat transaksi pembalik:", insertError);
    return { success: false, error: insertError.message };
  }

  revalidateInventoryRoutes();
  return { success: true, movementId: input.clientUuid };
}

export interface CreateItemInput {
  name: string;
  categoryCode: string;
  baseUnitName: string;
  minStock?: number;
  targetStock?: number;
  defaultLocationId?: string | null;
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

  // 3. Default lokasi (pakai pilihan user jika ada, atau fallback ke lokasi pertama)
  let defaultLocationId = input.defaultLocationId || null;
  if (!defaultLocationId) {
    const { data: locs } = await supabase.from("locations").select("id").limit(1);
    defaultLocationId = locs && locs[0] ? locs[0].id : null;
  }

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

  revalidateInventoryRoutes();

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

  // 3. Validasi penguncian satuan dasar jika sudah ada riwayat transaksi
  // Catatan: Kode barang BOLEH diubah oleh Admin (referensi mutasi stok memakai item_id UUID).
  if (hasTransactions) {
    if (
      input.baseUnitName &&
      oldItem.unit &&
      input.baseUnitName.trim().toLowerCase() !== oldItem.unit.name.trim().toLowerCase()
    ) {
      return {
        success: false,
        error: `Barang ${oldItem.code} sudah memiliki riwayat mutasi stok. Satuan dasar dikunci dan tidak boleh diubah agar data historis tidak rusak.`,
      };
    }
  }

  // 4. Kategori & Jenis (Kind)
  let categoryId = oldItem.category_id;
  let targetKind = oldItem.kind;
  const oldCategoryCode = (oldItem.category as any)?.code;
  const isCategoryChanged =
    Boolean(input.categoryCode) &&
    input.categoryCode.trim().toUpperCase() !== oldCategoryCode?.trim().toUpperCase();

  if (isCategoryChanged) {
    const targetCatCode = input.categoryCode.trim().toUpperCase();
    let { data: newCat } = await supabase
      .from("categories")
      .select("id, code, name, kind")
      .eq("code", targetCatCode)
      .maybeSingle();

    if (!newCat && targetCatCode === "IT") {
      const { data: createdIT, error: createErr } = await supabase
        .from("categories")
        .insert({
          code: "IT",
          name: "Peralatan IT & Multimedia",
          kind: "INSTRUMENT",
        })
        .select("id, code, name, kind")
        .single();
      if (createErr) {
        return { success: false, error: "Gagal membuat kategori IT: " + createErr.message };
      }
      newCat = createdIT;
    }

    if (!newCat) {
      return { success: false, error: `Kategori "${targetCatCode}" tidak ditemukan di sistem.` };
    }

    categoryId = newCat.id;
    targetKind = newCat.kind;
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

  // 6. Kode baru (bisa diubah oleh Admin kapan saja, divalidasi keunikan kodenya)
  let finalCode = oldItem.code;
  if (isCategoryChanged) {
    const targetCatCode = input.categoryCode.trim().toUpperCase();
    const candidate = input.code ? input.code.trim().toUpperCase() : "";

    // Jika user memberikan kode baru dengan prefix kategori tujuan yang benar dan belum dipakai
    if (candidate && candidate.startsWith(`${targetCatCode}-`) && candidate !== oldItem.code) {
      const { data: existingCode } = await supabase
        .from("items")
        .select("id")
        .eq("code", candidate)
        .neq("id", input.itemId)
        .maybeSingle();

      if (existingCode) {
        const { data: targetCatItems } = await supabase
          .from("items")
          .select("code")
          .eq("category_id", categoryId)
          .neq("id", input.itemId);
        finalCode = generateNextItemCode(targetCatCode, (targetCatItems || []).map((i) => i.code));
      } else {
        finalCode = candidate;
      }
    } else {
      // Otomatis hasilkan nomor kode berikutnya untuk kategori baru
      const { data: targetCatItems } = await supabase
        .from("items")
        .select("code")
        .eq("category_id", categoryId)
        .neq("id", input.itemId);
      finalCode = generateNextItemCode(targetCatCode, (targetCatItems || []).map((i) => i.code));
    }
  } else if (input.code && input.code.trim().toUpperCase() !== oldItem.code) {
    const newCodeCandidate = input.code.trim().toUpperCase();
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
  if (oldItem.kind !== targetKind) {
    diff.kind = { old: oldItem.kind, new: targetKind };
  }
  if (input.defaultLocationId && oldItem.default_location_id !== input.defaultLocationId) {
    diff.default_location_id = { old: oldItem.default_location_id, new: input.defaultLocationId };
  }

  // 8. Eksekusi Update
  const targetStockToSave =
    input.targetStock !== undefined
      ? Number(input.targetStock)
      : oldItem.target_stock !== undefined && oldItem.target_stock !== null
      ? Number(oldItem.target_stock)
      : Number(input.minStock || 0) * 2;

  const locationToSave =
    input.defaultLocationId !== undefined
      ? input.defaultLocationId || null
      : oldItem.default_location_id;

  const { error: updateErr } = await supabase
    .from("items")
    .update({
      name: input.name.trim(),
      category_id: categoryId,
      kind: targetKind,
      base_unit_id: baseUnitId,
      code: finalCode,
      min_stock: Number(input.minStock || 0),
      target_stock: targetStockToSave,
      default_location_id: locationToSave,
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

  // 10. Otomatis rapikan urutan nomor kode jika terjadi perpindahan kategori
  if (isCategoryChanged) {
    if (oldCategoryCode) {
      try {
        await resequenceCategoryCodes(oldCategoryCode, supabase);
      } catch (err) {
        console.warn(`Gagal resequence kategori lama ${oldCategoryCode}:`, err);
      }
    }
    try {
      await resequenceCategoryCodes(input.categoryCode, supabase);
    } catch (err) {
      console.warn(`Gagal resequence kategori baru ${input.categoryCode}:`, err);
    }
  }

  revalidateInventoryRoutes();

  return { success: true };
}

/**
 * Merapikan nomor urut kode barang (PREFIX-001, PREFIX-002, ...) dalam satu kategori
 * agar kontinu dan tidak ada nomor yang bolong, menggunakan update dua tahap yang aman dari konflik key.
 */
export async function resequenceCategoryCodes(
  categoryCode: string,
  supabaseClient?: any
): Promise<{ success: boolean; updatedCount: number; error?: string }> {
  const supabase = supabaseClient || createAdminClient();
  const cleanPrefix = categoryCode.trim().toUpperCase();

  // 1. Ambil kategori
  const { data: cat } = await supabase
    .from("categories")
    .select("id, code")
    .eq("code", cleanPrefix)
    .maybeSingle();

  if (!cat) {
    return { success: false, updatedCount: 0, error: `Kategori ${cleanPrefix} tidak ditemukan.` };
  }

  // 2. Ambil seluruh barang dalam kategori ini (termasuk nonaktif)
  const { data: items, error: fetchErr } = await supabase
    .from("items")
    .select("id, code, created_at")
    .eq("category_id", cat.id);

  if (fetchErr || !items || items.length === 0) {
    return { success: true, updatedCount: 0 };
  }

  // 3. Hitung pemetaan resequence menggunakan algoritma deterministik
  const plan = calculateResequencedCodes(cleanPrefix, items);
  const changedItems = plan.filter((p) => p.changed);

  if (changedItems.length === 0) {
    return { success: true, updatedCount: 0 };
  }

  // 4. Update aman dua tahap untuk menghindari benturan unique constraint:
  // Tahap A: Beri kode temporary unik
  for (let i = 0; i < changedItems.length; i++) {
    const item = changedItems[i];
    const tempCode = `__TMP_${item.id.replace(/-/g, "").slice(0, 8)}_${i}_${Date.now()}`;
    const { error: tempErr } = await supabase
      .from("items")
      .update({ code: tempCode, updated_at: new Date().toISOString() })
      .eq("id", item.id);

    if (tempErr) {
      console.error(`Gagal set temp code item ${item.id}:`, tempErr);
      return { success: false, updatedCount: 0, error: tempErr.message };
    }
  }

  // Tahap B: Set ke kode final yang rapi (PREFIX-001, PREFIX-002, ...)
  for (const item of changedItems) {
    const { error: finalErr } = await supabase
      .from("items")
      .update({ code: item.newCode, updated_at: new Date().toISOString() })
      .eq("id", item.id);

    if (finalErr) {
      console.error(`Gagal set final code item ${item.id} -> ${item.newCode}:`, finalErr);
      return { success: false, updatedCount: 0, error: finalErr.message };
    }
  }

  return { success: true, updatedCount: changedItems.length };
}

/**
 * Server Action: Merapikan nomor urut kode barang pada suatu kategori secara manual
 */
export async function manualResequenceCategoryAction(categoryCode: string) {
  const res = await resequenceCategoryCodes(categoryCode);
  if (res.success) {
    revalidateInventoryRoutes();
  }
  return res;
}

/**
 * Hapus Master Barang Secara Permanen (Hanya jika belum memiliki riwayat mutasi stok)
 * 1. Cek apakah ada riwayat di stock_movements, stock_take_lines, purchase_lines.
 * 2. Jika ada mutasi: TOLAK dengan pesan jelas (anjurkan Nonaktifkan).
 * 3. Jika tidak ada mutasi: bersihkan data pendukung non-restriktif, lalu hapus master item.
 * 4. Catat ke audit_log.
 * 5. Otomatis merapikan nomor urut kode barang (resequence) pada kategori terkait.
 */
export async function deleteItemAction(input: { itemId: string }): Promise<{
  success: boolean;
  error?: string;
  message?: string;
}> {
  if (!input.itemId) {
    return { success: false, error: "ID barang tidak valid." };
  }

  const supabase = createAdminClient();

  // 1. Ambil data barang yang akan dihapus
  const { data: item, error: fetchErr } = await supabase
    .from("items")
    .select("id, code, name, category_id, category:categories(code, name)")
    .eq("id", input.itemId)
    .single();

  if (fetchErr || !item) {
    return { success: false, error: "Barang tidak ditemukan atau sudah dihapus." };
  }

  // 2. Periksa apakah barang memiliki riwayat transaksi di stock_movements
  const { count: txCount } = await supabase
    .from("stock_movements")
    .select("id", { count: "exact", head: true })
    .eq("item_id", input.itemId);

  if ((txCount || 0) > 0) {
    return {
      success: false,
      error: `Barang "${item.name}" (${item.code}) sudah memiliki ${txCount} catatan mutasi stok. Sesuai prinsip integritas audit, barang tidak dapat dihapus permanen agar data historis tidak rusak. Gunakan tombol "Nonaktifkan" untuk menyembunyikannya.`,
    };
  }

  // 3. Periksa relasi lain: stock_take_lines
  const { count: stCount } = await supabase
    .from("stock_take_lines")
    .select("id", { count: "exact", head: true })
    .eq("item_id", input.itemId);

  if ((stCount || 0) > 0) {
    return {
      success: false,
      error: `Barang "${item.name}" (${item.code}) tercatat dalam ${stCount} baris stock opname. Silakan gunakan tombol "Nonaktifkan".`,
    };
  }

  // 4. Periksa relasi: purchase_lines
  const { count: poCount } = await supabase
    .from("purchase_lines")
    .select("id", { count: "exact", head: true })
    .eq("item_id", input.itemId);

  if ((poCount || 0) > 0) {
    return {
      success: false,
      error: `Barang "${item.name}" (${item.code}) memiliki riwayat data pembelian. Silakan gunakan tombol "Nonaktifkan".`,
    };
  }

  // 5. Bersihkan entitas anak jika ada (unit_conversions, price_history)
  await supabase.from("unit_conversions").delete().eq("item_id", input.itemId);
  await supabase.from("price_history").delete().eq("item_id", input.itemId);

  // 6. Hapus fisik barang dari tabel items
  const { error: deleteErr } = await supabase
    .from("items")
    .delete()
    .eq("id", input.itemId);

  if (deleteErr) {
    return { success: false, error: "Gagal menghapus barang: " + deleteErr.message };
  }

  // 7. Catat ke audit_log
  try {
    await supabase.from("audit_log").insert({
      entity: "items",
      entity_id: input.itemId,
      action: "DELETE",
      diff: {
        deleted_item: {
          code: item.code,
          name: item.name,
          category: (item.category as any)?.code || null,
        },
      },
    });
  } catch (err) {
    console.warn("Gagal mencatat audit log hapus:", err);
  }

  // 8. Otomatis rapikan kembali nomor urut kode barang pada kategori tersebut
  const catCode = (item.category as any)?.code;
  if (catCode) {
    try {
      await resequenceCategoryCodes(catCode, supabase);
    } catch (resErr) {
      console.warn(`Gagal merapikan urutan nomor kategori ${catCode}:`, resErr);
    }
  }

  revalidateInventoryRoutes();

  return {
    success: true,
    message: `Barang "${item.name}" (${item.code}) berhasil dihapus dan urutan nomor kategori ${catCode || ""} telah otomatis dirapikan.`,
  };
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

  revalidateInventoryRoutes();

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

/**
 * Menambahkan atau memperbarui aturan konversi satuan kemasan untuk suatu barang
 * (misal: 1 Box = 12 Pcs atau 1 Dus = 24 Pcs)
 */
export async function saveUnitConversionAction(input: {
  itemId: string;
  fromUnitName: string;
  factor: number;
}): Promise<{
  success: boolean;
  error?: string;
  conversion?: {
    id: string;
    item_id: string;
    from_unit_id: string;
    to_unit_id: string;
    factor: number;
    from_unit: { id: string; name: string };
    to_unit: { id: string; name: string } | null;
  };
}> {
  if (!input.itemId || !input.fromUnitName?.trim() || !input.factor || input.factor <= 0) {
    return { success: false, error: "Nama kemasan dan faktor konversi (> 0) wajib diisi." };
  }

  const supabase = createAdminClient();

  const { data: item } = await supabase
    .from("items")
    .select("id, base_unit_id, unit:units(id, name)")
    .eq("id", input.itemId)
    .single();

  if (!item) {
    return { success: false, error: "Barang tidak ditemukan." };
  }

  let { data: fromUnit } = await supabase
    .from("units")
    .select("id, name")
    .ilike("name", input.fromUnitName.trim())
    .maybeSingle();

  if (!fromUnit) {
    const { data: createdUnit, error: uErr } = await supabase
      .from("units")
      .insert({ name: input.fromUnitName.trim() })
      .select("id, name")
      .single();
    if (uErr || !createdUnit) {
      return { success: false, error: uErr?.message || "Gagal membuat satuan baru." };
    }
    fromUnit = createdUnit;
  }

  if (fromUnit.id === item.base_unit_id) {
    return { success: false, error: "Satuan kemasan harus berbeda dari satuan dasar barang." };
  }

  const { data: conv, error: convErr } = await supabase
    .from("unit_conversions")
    .upsert(
      {
        item_id: input.itemId,
        from_unit_id: fromUnit.id,
        to_unit_id: item.base_unit_id,
        factor: input.factor,
      },
      { onConflict: "item_id,from_unit_id,to_unit_id" }
    )
    .select("id, item_id, from_unit_id, to_unit_id, factor")
    .single();

  if (convErr || !conv) {
    return { success: false, error: convErr?.message || "Gagal menyimpan konversi satuan." };
  }

  revalidatePath("/masuk");
  return {
    success: true,
    conversion: {
      ...conv,
      factor: Number(conv.factor),
      from_unit: fromUnit,
      to_unit: (item.unit as unknown as { id: string; name: string } | null) || null,
    },
  };
}
