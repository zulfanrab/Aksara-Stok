"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { generatePhotoPath } from "@/lib/storage";

const BUCKET_NAME = "proof-photos";

/**
 * Memastikan bucket storage tersedia di Supabase.
 */
async function ensureBucketExists(supabase: ReturnType<typeof createAdminClient>) {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const found = buckets?.some((b) => b.name === BUCKET_NAME);
    if (!found) {
      await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 1048576 * 5, // 5MB limit
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
      });
    }
  } catch (err) {
    console.warn("Peringatan inisialisasi bucket storage:", err);
  }
}

/**
 * Server Action untuk mengunggah foto bukti ke Supabase Storage.
 * Menerima FormData dengan berkas terkompresi.
 */
export async function uploadProofPhotoAction(formData: FormData) {
  const file = formData.get("file") as File | null;
  const folder = (formData.get("folder") as "opname" | "receipts" | "assets" | "items") || "opname";
  const entityId = (formData.get("entityId") as string) || crypto.randomUUID();

  if (!file) {
    return { success: false, error: "Tidak ada berkas gambar yang dikirim." };
  }

  const supabase = createAdminClient();
  await ensureBucketExists(supabase);

  const filePath = generatePhotoPath(folder, entityId);
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, buffer, {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (uploadError) {
    console.error("Gagal mengunggah foto ke storage:", uploadError);
    return { success: false, error: uploadError.message };
  }

  const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);

  // Cadangan Google Drive (opsional, jika Apps Script dikonfigurasi)
  const appsScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
  const appsScriptSecret = process.env.GOOGLE_APPS_SCRIPT_SECRET;
  if (appsScriptUrl && appsScriptSecret) {
    try {
      const base64Data = buffer.toString("base64");
      fetch(appsScriptUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: appsScriptSecret,
          name: `${entityId}.jpg`,
          mime: "image/jpeg",
          data: base64Data,
        }),
      }).catch((err) => console.warn("Background Drive upload warning:", err));
    } catch (driveErr) {
      console.warn("Drive sync skipped:", driveErr);
    }
  }

  return {
    success: true,
    photoPath: filePath,
    publicUrl: urlData.publicUrl,
  };
}

/**
 * Server Action untuk menyimpan path foto referensi ke kolom photo_path di tabel items.
 * Dipanggil setelah upload berhasil (uploadProofPhotoAction) agar foto terhubung ke master barang.
 */
export async function updateItemPhotoAction(itemId: string, photoPath: string) {
  if (!itemId || !photoPath) {
    return { success: false, error: "ID barang dan path foto wajib ada." };
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("items")
    .update({ photo_path: photoPath, updated_at: new Date().toISOString() })
    .eq("id", itemId);

  if (error) {
    console.error("Gagal menyimpan path foto ke master barang:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/barang");
  revalidatePath("/keluar");
  revalidatePath("/masuk");
  revalidatePath("/laporan");
  revalidatePath("/laporan/cetak");
  revalidatePath("/opname");
  return { success: true };
}

/**
 * Server Action untuk menautkan path foto bukti ke baris opname fisik.
 */
export async function updateStockTakeLinePhotoAction(lineId: string, photoPath: string, stockTakeId?: string) {
  if (!lineId || !photoPath) {
    return { success: false, error: "ID baris opname dan path foto wajib ada." };
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("stock_take_lines")
    .update({
      photo_path: photoPath,
      updated_at: new Date().toISOString(),
    })
    .eq("id", lineId);

  if (error) {
    console.error("Gagal menyimpan path foto ke baris opname:", error);
    return { success: false, error: error.message };
  }

  if (stockTakeId) {
    revalidatePath(`/opname/${stockTakeId}`);
  }
  revalidatePath("/opname");

  return { success: true };
}
