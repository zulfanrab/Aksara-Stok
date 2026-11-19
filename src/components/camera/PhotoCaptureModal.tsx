"use client";

import { useState, useRef, useTransition, useEffect } from "react";
import { Camera, X, Check, Sparkles, Loader2, AlertCircle, MapPin } from "lucide-react";
import { compressImageFile, type CompressResult } from "@/lib/storage/compressor";
import { uploadProofPhotoAction } from "@/lib/actions/upload";

interface PhotoCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  folder?: "opname" | "receipts" | "assets" | "items";
  entityId: string;
  onUploadSuccess: (photoPath: string, publicUrl?: string) => void;
  /** Jika true: hanya tampilkan tombol kamera (tidak ada tombol Pilih Galeri).
   *  Digunakan untuk foto aset/alat agar foto tidak bisa diambil dari galeri. */
  cameraOnly?: boolean;
}

export function PhotoCaptureModal({
  isOpen,
  onClose,
  title = "Ambil Foto Bukti",
  folder = "opname",
  entityId,
  onUploadSuccess,
  cameraOnly = false,
}: PhotoCaptureModalProps) {
  const [compressResult, setCompressResult] = useState<CompressResult | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isPending, startTransition] = useTransition();
  const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "ok" | "denied">("idle");
  const [geoCoords, setGeoCoords] = useState<GeolocationCoordinates | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Minta izin lokasi saat modal dibuka (tidak memblokir — opsional)
  useEffect(() => {
    if (!isOpen) return;
    if (!("geolocation" in navigator)) return;
    setGeoStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoCoords(pos.coords);
        setGeoStatus("ok");
      },
      () => {
        setGeoStatus("denied");
      },
      { timeout: 5000, maximumAge: 60000 }
    );
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input agar bisa pilih file yang sama lagi jika ulangi
    e.target.value = "";

    setErrorMsg("");
    setIsCompressing(true);

    try {
      const capturedAt = new Date();
      const result = await compressImageFile(file, {
        maxDimension: 1280,
        quality: 0.82,
        fileName: `${entityId}.jpg`,
        watermark: {
          capturedAt,
          coords: geoCoords ?? undefined,
        },
      });
      setCompressResult(result);
    } catch (err) {
      console.error("Kompresi gagal:", err);
      setErrorMsg("Gagal memproses gambar. Pastikan format berkas didukung (JPG/PNG).");
    } finally {
      setIsCompressing(false);
    }
  };

  const handleUpload = () => {
    if (!compressResult) return;

    setErrorMsg("");
    startTransition(async () => {
      const formData = new FormData();
      formData.append("file", compressResult.file);
      formData.append("folder", folder);
      formData.append("entityId", entityId);

      const res = await uploadProofPhotoAction(formData);

      if (res.success && res.photoPath) {
        onUploadSuccess(res.photoPath, res.publicUrl);
        handleClose();
      } else {
        setErrorMsg(res.error || "Gagal mengunggah foto ke penyimpanan.");
      }
    });
  };

  const handleClose = () => {
    setCompressResult(null);
    setErrorMsg("");
    onClose();
  };

  const formatKB = (bytes: number) => (bytes / 1024).toFixed(0) + " KB";

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-[var(--slate-200)] animate-in fade-in zoom-in-95 duration-150">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--emerald-50)] text-[var(--emerald-600)] flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-[var(--slate-900)]">{title}</h3>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-[var(--slate-400)] hover:text-[var(--slate-700)] touch-target"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Hidden inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelected}
          className="hidden"
        />
        {/* Input galeri: hanya ada jika bukan cameraOnly */}
        {!cameraOnly && (
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelected}
            className="hidden"
          />
        )}

        {/* Pilihan sumber foto */}
        {!compressResult && !isCompressing && (
          <div className="space-y-3 py-1">
            {/* Info GPS */}
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              {geoStatus === "loading" && <span>Mencari lokasi GPS...</span>}
              {geoStatus === "ok" && (
                <span className="text-emerald-700 font-semibold">
                  GPS aktif — koordinat akan dibakar ke foto
                </span>
              )}
              {geoStatus === "denied" && (
                <span className="text-slate-400">
                  Izin lokasi ditolak — foto tetap memiliki cap waktu
                </span>
              )}
              {geoStatus === "idle" && <span className="text-slate-400">Meminta izin lokasi...</span>}
            </div>

            <p className="text-xs text-[var(--slate-400)] text-center leading-relaxed">
              {cameraOnly
                ? "Foto langsung dari kamera. Cap waktu & lokasi otomatis dibakar ke foto."
                : "Foto langsung dari kamera atau pilih dari galeri."}
            </p>

            {cameraOnly ? (
              /* Mode kamera saja — satu tombol besar */
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="w-full flex flex-col items-center justify-center gap-2 py-7 rounded-2xl border-2 border-dashed border-[var(--emerald-500)]/50 bg-[var(--emerald-50)]/40 hover:bg-[var(--emerald-50)] text-[var(--emerald-700)] active:scale-98 transition-all touch-target"
              >
                <Camera className="w-9 h-9 text-[var(--emerald-600)]" />
                <span className="text-sm font-bold">Ambil Foto</span>
                <span className="text-[11px] text-[var(--emerald-600)]">Buka kamera belakang</span>
              </button>
            ) : (
              /* Mode normal — dua tombol */
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-[var(--emerald-500)]/40 bg-[var(--emerald-50)]/30 hover:bg-[var(--emerald-50)] text-[var(--emerald-700)] active:scale-98 transition-all touch-target"
                >
                  <Camera className="w-6 h-6 mb-1 text-[var(--emerald-600)]" />
                  <span className="text-xs font-bold">Buka Kamera</span>
                  <span className="text-[10px] text-[var(--emerald-600)]">Langsung dari HP</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 text-[var(--slate-700)] active:scale-98 transition-all touch-target"
                >
                  <svg className="w-6 h-6 mb-1 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <span className="text-xs font-bold">Pilih Galeri</span>
                  <span className="text-[10px] text-[var(--slate-400)]">File Gambar</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Loading kompresi */}
        {isCompressing && (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
            <Loader2 className="w-8 h-8 text-[var(--emerald-600)] animate-spin" />
            <span className="text-xs font-bold text-[var(--slate-900)]">Memproses Foto...</span>
            <span className="text-[11px] text-[var(--slate-400)]">Kompres & bakar cap waktu</span>
          </div>
        )}

        {/* Pratinjau setelah kompresi */}
        {compressResult && !isCompressing && (
          <div className="space-y-3">
            <div className="relative aspect-4/3 rounded-xl overflow-hidden bg-slate-100 border border-[var(--slate-200)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={compressResult.dataUrl}
                alt="Pratinjau Foto"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 right-2 px-2 py-1 rounded bg-black/70 text-white text-[10px] font-bold num-mono flex items-center gap-1 backdrop-blur-xs">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>Hemat {compressResult.compressionRatio}%</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] flex items-center justify-between num-mono">
              <span className="text-slate-500">
                Ukuran: {formatKB(compressResult.originalSize)} &rarr;{" "}
                <strong className="text-emerald-700">{formatKB(compressResult.compressedSize)}</strong>
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                Siap Unggah
              </span>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setCompressResult(null)}
                disabled={isPending}
                className="flex-1 py-3 rounded-xl border border-[var(--slate-200)] text-[var(--slate-700)] text-xs font-semibold hover:bg-slate-50 touch-target disabled:opacity-50"
              >
                Ulangi Foto
              </button>
              <button
                type="button"
                onClick={handleUpload}
                disabled={isPending}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[var(--emerald-600)] to-[var(--emerald-700)] text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 touch-target active:scale-98 disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Mengunggah...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Simpan Foto</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
