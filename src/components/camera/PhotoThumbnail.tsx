"use client";

import { useState } from "react";
import { Image as ImageIcon, X, ExternalLink, Camera, ZoomIn } from "lucide-react";

interface PhotoThumbnailProps {
  photoPath?: string | null;
  publicUrl?: string | null;
  altText?: string;
  onOpenUpload?: () => void;
  required?: boolean;
}

export function PhotoThumbnail({
  photoPath,
  publicUrl,
  altText = "Bukti Foto",
  onOpenUpload,
  required = false,
}: PhotoThumbnailProps) {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Resolusi URL publik Supabase Storage jika yang ada adalah photoPath
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qzqrgxkamixxgmggxhuq.supabase.co";
  const resolvedUrl =
    publicUrl || (photoPath ? `${supabaseUrl}/storage/v1/object/public/proof-photos/${photoPath}` : null);

  if (!resolvedUrl) {
    return (
      <button
        type="button"
        onClick={onOpenUpload}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all active:scale-95 touch-target ${
          required
            ? "bg-rose-50 border-rose-300 text-rose-700 hover:bg-rose-100"
            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
        }`}
      >
        <Camera className="w-3.5 h-3.5" />
        <span>{required ? "Wajib Foto" : "Unggah Foto"}</span>
      </button>
    );
  }

  return (
    <>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setIsLightboxOpen(true)}
          className="relative w-9 h-9 rounded-lg overflow-hidden border border-[var(--slate-200)] group hover:opacity-90 active:scale-95 transition-all shrink-0"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolvedUrl}
            alt={altText}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <ZoomIn className="w-3.5 h-3.5 text-white" />
          </div>
        </button>

        {onOpenUpload && (
          <button
            type="button"
            onClick={onOpenUpload}
            className="text-[10px] text-slate-500 hover:text-emerald-700 underline"
          >
            Ganti
          </button>
        )}
      </div>

      {/* Lightbox Dialog */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative max-w-lg w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-3 bg-slate-950/80 flex items-center justify-between border-b border-slate-800">
              <span className="text-xs font-semibold text-slate-200 truncate">{altText}</span>
              <div className="flex items-center gap-2">
                <a
                  href={resolvedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 rounded text-slate-400 hover:text-white"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setIsLightboxOpen(false)}
                  className="p-1 rounded text-slate-400 hover:text-white touch-target"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="relative aspect-4/3 bg-black flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolvedUrl}
                alt={altText}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
