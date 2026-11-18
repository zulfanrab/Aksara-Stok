"use client";

import { useState, useRef, useTransition } from "react";
import { Camera, Upload, X, Check, Image as ImageIcon, Sparkles, Loader2, AlertCircle } from "lucide-react";
import { compressImageFile, type CompressResult } from "@/lib/storage/compressor";
import { uploadProofPhotoAction } from "@/lib/actions/upload";

interface PhotoCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  folder?: "opname" | "receipts" | "assets" | "items";
  entityId: string;
  onUploadSuccess: (photoPath: string, publicUrl?: string) => void;
}

export function PhotoCaptureModal({
  isOpen,
  onClose,
  title = "Ambil Foto Bukti",
  folder = "opname",
  entityId,
  onUploadSuccess,
}: PhotoCaptureModalProps) {
  const [compressResult, setCompressResult] = useState<CompressResult | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg("");
    setIsCompressing(true);

    try {
      const result = await compressImageFile(file, {
        maxDimension: 1280,
        quality: 0.8,
        fileName: `${entityId}.jpg`,
      });
      setCompressResult(result);
    } catch (err) {
      console.error("Kompresi gagal:", err);
      setErrorMsg("Gagal mengompres gambar. Pastikan format berkas didukung (JPG/PNG).");
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

  const formatKB = (bytes: number) => {
    return (bytes / 1024).toFixed(0) + " KB";
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl border border-[var(--slate-200)] animate-in fade-in zoom-in-95 duration-150">
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

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Hidden File Inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelected}
          className="hidden"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelected}
          className="hidden"
        />

        {/* Preview Area */}
        {!compressResult && !isCompressing && (
          <div className="space-y-3 py-2">
            <p className="text-xs text-[var(--slate-400)] text-center leading-relaxed">
              Foto akan otomatis dikompres di perangkat (&le; 1280 px / &le; 200 KB) sebelum dikirim untuk menghemat kuota.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
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
                <Upload className="w-6 h-6 mb-1 text-slate-500" />
                <span className="text-xs font-bold">Pilih Galeri</span>
                <span className="text-[10px] text-[var(--slate-400)]">File Gambar</span>
              </button>
            </div>
          </div>
        )}

        {isCompressing && (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
            <Loader2 className="w-8 h-8 text-[var(--emerald-600)] animate-spin" />
            <span className="text-xs font-bold text-[var(--slate-900)]">Mengompres Foto di Perangkat...</span>
            <span className="text-[11px] text-[var(--slate-400)]">Mengoptimalkan resolusi ke 1280 px</span>
          </div>
        )}

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
              <span className="text-slate-500">Ukuran: {formatKB(compressResult.originalSize)} &rarr; <strong className="text-emerald-700">{formatKB(compressResult.compressedSize)}</strong></span>
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
