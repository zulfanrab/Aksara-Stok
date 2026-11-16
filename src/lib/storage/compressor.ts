/**
 * Modul Kompresi Foto di Sisi Klien (Browser / Ponsel Lapangan)
 * PT Aksara Riksa Perdana
 * Mengacu pada BLUEPRINT.md Bagian 5 & Bagian 15:
 * "Kompres di perangkat (sisi terpanjang sekitar 1280 px, sekitar 200 KB) sebelum unggah."
 */

export interface ScaledDimensions {
  width: number;
  height: number;
  scaled: boolean;
}

export interface CompressResult {
  file: File;
  blob: Blob;
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number; // Persentase penghematan ukuran file
}

export interface CompressOptions {
  maxDimension?: number; // Default 1280 px
  quality?: number; // Default 0.8 (JPEG)
  fileName?: string;
}

/**
 * Menghitung dimensi baru dengan mempertahankan rasio aspek gambar asli.
 * Fungsi murni (pure function), dapat diuji unit tanpa ketergantungan DOM.
 */
export function calculateScaledDimensions(
  origWidth: number,
  origHeight: number,
  maxDimension: number = 1280
): ScaledDimensions {
  if (origWidth <= 0 || origHeight <= 0) {
    return { width: maxDimension, height: maxDimension, scaled: false };
  }

  if (origWidth <= maxDimension && origHeight <= maxDimension) {
    return { width: origWidth, height: origHeight, scaled: false };
  }

  let width = origWidth;
  let height = origHeight;

  if (origWidth > origHeight) {
    width = maxDimension;
    height = Math.round((origHeight * maxDimension) / origWidth);
  } else {
    height = maxDimension;
    width = Math.round((origWidth * maxDimension) / origHeight);
  }

  return { width, height, scaled: true };
}

/**
 * Mengompres file gambar di browser menggunakan HTML5 Canvas.
 */
export async function compressImageFile(
  file: File | Blob,
  options: CompressOptions = {}
): Promise<CompressResult> {
  const maxDim = options.maxDimension || 1280;
  const quality = options.quality !== undefined ? options.quality : 0.8;
  const originalSize = file.size;

  if (typeof window === "undefined") {
    throw new Error("Kompresi gambar hanya dapat dijalankan di lingkungan peramban (browser).");
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (readerEvent) => {
      const dataUrl = readerEvent.target?.result as string;
      const img = new Image();

      img.onload = () => {
        const { width, height } = calculateScaledDimensions(img.width, img.height, maxDim);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Gagal menginisialisasi 2D Canvas context."));
          return;
        }

        // Render gambar ke canvas dengan resampling bilinear
        ctx.drawImage(img, 0, 0, width, height);

        // Ekspor ke Blob JPEG
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Gagal mengonversi canvas ke JPEG blob."));
              return;
            }

            const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
            const fileName =
              options.fileName ||
              (file instanceof File ? file.name.replace(/\.[^/.]+$/, "") + ".jpg" : `foto-${Date.now()}.jpg`);

            const compressedFile = new File([blob], fileName, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });

            const compressedSize = blob.size;
            const savedBytes = Math.max(0, originalSize - compressedSize);
            const compressionRatio = originalSize > 0 ? Math.round((savedBytes / originalSize) * 100) : 0;

            resolve({
              file: compressedFile,
              blob,
              dataUrl: compressedDataUrl,
              originalSize,
              compressedSize,
              compressionRatio,
            });
          },
          "image/jpeg",
          quality
        );
      };

      img.onerror = () => {
        reject(new Error("Gagal mendekode berkas gambar."));
      };

      img.src = dataUrl;
    };

    reader.onerror = () => {
      reject(new Error("Gagal membaca berkas file gambar."));
    };

    reader.readAsDataURL(file);
  });
}
