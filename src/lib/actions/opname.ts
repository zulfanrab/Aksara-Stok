"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentStockMap } from "@/lib/services/inventory";

export interface CreateStockTakeInput {
  name: string;
  startedByProfileId: string;
  scopeCategoryCode?: string;
}

export interface SubmitCountInput {
  lineId: string;
  countedQty: number;
  countedByPersonId: string;
  photoPath?: string | null;
  reason?: string | null;
}

export interface SubmitRecountInput {
  lineId: string;
  recountQty: number;
  reason: string;
}

export interface ApproveStockTakeInput {
  stockTakeId: string;
  approvedByProfileId: string;
}

export interface PostStockTakeInput {
  stockTakeId: string;
}

/**
 * Membuka sesi stock opname baru dan men-snapshot system_qty dari semua barang
 */
export async function createStockTakeAction(input: CreateStockTakeInput) {
  if (!input.name || input.name.trim().length < 3) {
    return { success: false, error: "Nama sesi opname wajib diisi minimal 3 karakter." };
  }
  if (!input.startedByProfileId) {
    return { success: false, error: "Admin pembuka sesi wajib dipilih." };
  }

  const supabase = createAdminClient();

  // 1. Buat sesi stock_takes
  const { data: stockTake, error: createError } = await supabase
    .from("stock_takes")
    .insert({
      name: input.name.trim(),
      started_by: input.startedByProfileId,
      status: "COUNTING",
      cutoff_at: new Date().toISOString(),
      scope: input.scopeCategoryCode ? { category: input.scopeCategoryCode } : { all: true },
    })
    .select("id")
    .single();

  if (createError || !stockTake) {
    console.error("Gagal membuat sesi opname:", createError);
    return { success: false, error: createError?.message || "Gagal membuat sesi." };
  }

  // 2. Ambil master barang dan saldo sistem saat ini
  let itemsQuery = supabase.from("items").select("id, category:categories(code)").eq("is_active", true);
  const { data: items } = await itemsQuery;
  const stockMap = await getCurrentStockMap();

  let targetItems = items || [];
  if (input.scopeCategoryCode && input.scopeCategoryCode !== "ALL") {
    targetItems = targetItems.filter((i) => (i.category as { code?: string })?.code === input.scopeCategoryCode);
  }

  // 3. Snapshot baris hitungan stock_take_lines
  const linesToInsert = targetItems.map((item) => ({
    stock_take_id: stockTake.id,
    item_id: item.id,
    system_qty: stockMap[item.id] || 0,
    status: "PENDING",
  }));

  if (linesToInsert.length > 0) {
    const { error: linesError } = await supabase.from("stock_take_lines").insert(linesToInsert);
    if (linesError) {
      console.error("Gagal snapshot stock_take_lines:", linesError);
      return { success: false, error: linesError.message };
    }
  }

  revalidatePath("/opname");
  return { success: true, stockTakeId: stockTake.id };
}

/**
 * Menyimpan hasil hitung buta (Blind Count) per baris item
 */
export async function submitCountLineAction(input: SubmitCountInput) {
  if (!input.lineId) {
    return { success: false, error: "ID baris opname tidak valid." };
  }
  if (input.countedQty < 0) {
    return { success: false, error: "Hasil hitung fisik tidak boleh negatif." };
  }
  if (!input.countedByPersonId) {
    return { success: false, error: "Petugas penghitung wajib dipilih dari daftar karyawan." };
  }

  const supabase = createAdminClient();

  const updatePayload: Record<string, unknown> = {
    counted_qty: input.countedQty,
    counted_by_person_id: input.countedByPersonId,
    status: "COUNTED",
    updated_at: new Date().toISOString(),
  };

  if (input.photoPath !== undefined) {
    updatePayload.photo_path = input.photoPath || null;
  }
  if (input.reason !== undefined) {
    updatePayload.reason = input.reason?.trim() || null;
  }

  const { error } = await supabase
    .from("stock_take_lines")
    .update(updatePayload)
    .eq("id", input.lineId);

  if (error) {
    console.error("Gagal menyimpan hasil hitungan:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Mengubah status sesi opname dari COUNTING ke REVIEW secara eksplisit
 */
export async function markStockTakeReviewAction(stockTakeId: string) {
  if (!stockTakeId) {
    return { success: false, error: "ID sesi opname tidak valid." };
  }

  const supabase = createAdminClient();
  const { data: lines, error: linesErr } = await supabase
    .from("stock_take_lines")
    .select("id, counted_qty, recount_qty")
    .eq("stock_take_id", stockTakeId);

  if (linesErr) {
    return { success: false, error: linesErr.message };
  }

  const uncounted = (lines || []).filter(
    (l) => l.counted_qty === null && l.recount_qty === null
  ).length;

  if (uncounted > 0) {
    return {
      success: false,
      error: `Masih ada ${uncounted} barang yang belum dihitung fisik. Lengkapi semua hitungan sebelum lanjut ke Review.`,
    };
  }

  const { error } = await supabase
    .from("stock_takes")
    .update({ status: "REVIEW", updated_at: new Date().toISOString() })
    .eq("id", stockTakeId)
    .in("status", ["DRAFT", "COUNTING"]);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/opname/${stockTakeId}`);
  revalidatePath("/opname");
  return { success: true };
}

/**
 * Menyimpan hasil hitung ulang (Recount) untuk item di luar batas toleransi
 */
export async function submitRecountLineAction(input: SubmitRecountInput) {
  if (!input.lineId) {
    return { success: false, error: "ID baris opname tidak valid." };
  }
  if (input.recountQty < 0) {
    return { success: false, error: "Hasil hitung ulang tidak boleh negatif." };
  }
  if (!input.reason || input.reason.trim().length < 3) {
    return { success: false, error: "Alasan perbedaan fisik wajib diisi minimal 3 karakter." };
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("stock_take_lines")
    .update({
      recount_qty: input.recountQty,
      reason: input.reason.trim(),
      status: "RECOUNTED",
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.lineId);

  if (error) {
    console.error("Gagal menyimpan hitung ulang:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Mengesahkan sesi opname (Approval)
 * PENEGAKAN ATURAN:
 * 1. Semua item pada sesi harus sudah dihitung fisik.
 * 2. Trigger Postgres trg_stock_takes_prevent_self_approval
 *    akan melempar EXCEPTION jika approver pernah mencatat hitungan di sesi ini.
 */
export async function approveStockTakeAction(input: ApproveStockTakeInput) {
  if (!input.stockTakeId || !input.approvedByProfileId) {
    return { success: false, error: "Penyetuju wajib dipilih." };
  }

  const supabase = createAdminClient();

  const { data: lines, error: linesErr } = await supabase
    .from("stock_take_lines")
    .select("id, counted_qty, recount_qty")
    .eq("stock_take_id", input.stockTakeId);

  if (linesErr) {
    return { success: false, error: linesErr.message };
  }

  const uncounted = (lines || []).filter(
    (l) => l.counted_qty === null && l.recount_qty === null
  ).length;

  if (uncounted > 0) {
    return {
      success: false,
      error: `Masih ada ${uncounted} barang yang belum dihitung fisik! Selesaikan penghitungan terlebih dahulu agar stok tidak ter-nolkan secara tidak sengaja.`,
    };
  }

  const { error } = await supabase
    .from("stock_takes")
    .update({
      status: "APPROVED",
      approved_by: input.approvedByProfileId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.stockTakeId);

  if (error) {
    console.error("Gagal menyetujui sesi opname:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/opname/${input.stockTakeId}`);
  revalidatePath("/opname");
  return { success: true };
}

/**
 * Membukukan penyesuaian (Posting ADJUST) ke tabel append-only stock_movements
 */
export async function postStockTakeAction(input: PostStockTakeInput) {
  const supabase = createAdminClient();

  // 1. Ambil data sesi dan baris hitungan
  const { data: stockTake, error: takeError } = await supabase
    .from("stock_takes")
    .select("id, name, status")
    .eq("id", input.stockTakeId)
    .single();

  if (takeError || !stockTake) {
    return { success: false, error: "Sesi opname tidak ditemukan." };
  }

  if (stockTake.status !== "APPROVED") {
    return { success: false, error: "Sesi harus berstatus APPROVED sebelum dapat diposting." };
  }

  const { data: lines, error: linesError } = await supabase
    .from("stock_take_lines")
    .select("item_id, system_qty, counted_qty, recount_qty, reason")
    .eq("stock_take_id", input.stockTakeId);

  if (linesError || !lines) {
    return { success: false, error: "Gagal memuat baris hitungan opname." };
  }

  const uncounted = lines.filter((l) => l.recount_qty === null && l.counted_qty === null);
  if (uncounted.length > 0) {
    return {
      success: false,
      error: `Pembukuan ditolak: masih ada ${uncounted.length} baris yang belum dihitung fisik.`,
    };
  }

  // 2. Buat mutasi ADJUST untuk setiap baris yang sudah dihitung dan memiliki selisih fisik
  const adjustments = [];
  for (const line of lines) {
    if (line.recount_qty === null && line.counted_qty === null) {
      continue;
    }
    const finalCount = line.recount_qty !== null ? Number(line.recount_qty) : Number(line.counted_qty);
    const diff = finalCount - Number(line.system_qty);

    if (diff !== 0) {
      adjustments.push({
        id: crypto.randomUUID(),
        item_id: line.item_id,
        type: "ADJUST",
        qty: diff, // Bisa positif (fisik lebih banyak) atau negatif (fisik kurang)
        ref_type: "STOCK_TAKE",
        ref_id: stockTake.id,
        note: `Penyesuaian Opname ${stockTake.name}: ${line.reason || "Koreksi selisih fisik opname"}`,
        occurred_at: new Date().toISOString(),
      });
    }
  }

  if (adjustments.length > 0) {
    const { error: adjustError } = await supabase.from("stock_movements").insert(adjustments);
    if (adjustError) {
      console.error("Gagal posting pergerakan ADJUST:", adjustError);
      return { success: false, error: adjustError.message };
    }
  }

  // 3. Kunci status sesi menjadi POSTED
  const { error: statusError } = await supabase
    .from("stock_takes")
    .update({
      status: "POSTED",
      posted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.stockTakeId);

  if (statusError) {
    return { success: false, error: statusError.message };
  }

  revalidatePath(`/opname/${input.stockTakeId}`);
  revalidatePath(`/opname/${input.stockTakeId}/berita-acara`);
  revalidatePath("/opname");
  revalidatePath("/barang");
  revalidatePath("/keluar");
  revalidatePath("/masuk");
  revalidatePath("/riwayat");
  revalidatePath("/laporan");
  revalidatePath("/laporan/cetak");
  revalidatePath("/");
  return { success: true, adjustmentsCount: adjustments.length };
}
