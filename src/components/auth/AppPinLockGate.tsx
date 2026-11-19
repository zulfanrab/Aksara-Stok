"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Lock, Unlock, Delete, Shield, AlertCircle, Check } from "lucide-react";
import { APP_PIN, PIN_STORAGE_KEY, validateAppPin } from "@/lib/auth/pin";
import { cn } from "@/lib/utils";

interface AppPinLockGateProps {
  children: React.ReactNode;
}

export function AppPinLockGate({ children }: AppPinLockGateProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [isError, setIsError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Inisialisasi status unlock dari sessionStorage saat mount
  useEffect(() => {
    setIsMounted(true);
    try {
      const stored = window.sessionStorage.getItem(PIN_STORAGE_KEY);
      if (stored === "true") {
        setIsUnlocked(true);
      }
    } catch {
      // Jika sessionStorage diblokir, tetap lanjutkan
    }

    // Listener untuk aksi kunci manual dari menu
    const handleLock = () => {
      setIsUnlocked(false);
      setPin("");
      setIsError(false);
      setIsSuccess(false);
    };

    window.addEventListener("aksara-lock-app", handleLock);
    return () => window.removeEventListener("aksara-lock-app", handleLock);
  }, []);

  // Handler penambahan digit PIN
  const handleDigit = useCallback(
    (digit: string) => {
      if (isError || isSuccess || pin.length >= 4) return;

      const nextPin = pin + digit;
      setPin(nextPin);

      if (nextPin.length === 4) {
        if (validateAppPin(nextPin)) {
          setIsSuccess(true);
          try {
            navigator.vibrate?.(40);
          } catch {
            // Abaikan jika tidak didukung
          }
          try {
            window.sessionStorage.setItem(PIN_STORAGE_KEY, "true");
          } catch {
            // Abaikan
          }
          setTimeout(() => {
            setIsUnlocked(true);
            setIsSuccess(false);
            setPin("");
          }, 250);
        } else {
          setIsError(true);
          try {
            navigator.vibrate?.([60, 60, 60]);
          } catch {
            // Abaikan
          }
          setTimeout(() => {
            setPin("");
            setIsError(false);
          }, 600);
        }
      }
    },
    [isError, isSuccess, pin]
  );

  // Handler hapus satu digit terakhir
  const handleBackspace = useCallback(() => {
    if (isError || isSuccess) return;
    setPin((prev) => prev.slice(0, -1));
  }, [isError, isSuccess]);

  // Handler hapus seluruh digit
  const handleClear = useCallback(() => {
    if (isError || isSuccess) return;
    setPin("");
  }, [isError, isSuccess]);

  // Dukungan input keyboard fisik untuk desktop / laptop
  useEffect(() => {
    if (!isMounted || isUnlocked) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Abaikan jika fokus pada input elemen form lain (jika ada)
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === "Escape" || e.key === "Delete") {
        e.preventDefault();
        handleClear();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMounted, isUnlocked, handleDigit, handleBackspace, handleClear]);

  // Layar Splash Netral Sebelum Hydration (Mencegah Kilasan Data Rahasia)
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-400">
        <div className="w-12 h-12 rounded-2xl bg-emerald-950/60 border border-emerald-600/40 flex items-center justify-center animate-pulse mb-3">
          <Lock className="w-6 h-6 text-emerald-400" />
        </div>
        <p className="text-xs font-mono tracking-wider text-slate-500">MEMERIKSA AKSES...</p>
      </div>
    );
  }

  // Jika sudah terbuka (unlocked), tampilkan aplikasi penuh
  if (isUnlocked) {
    return <>{children}</>;
  }

  // Layar Kunci PIN (Tampilan Penuh dengan Nuansa Mewah Aksara)
  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white flex flex-col justify-between items-center py-8 px-4 select-none overflow-y-auto">
      {/* Header Identitas Kantor */}
      <div className="flex flex-col items-center text-center space-y-2 pt-2 animate-in fade-in duration-300">
        <div className="relative w-14 h-14 rounded-2xl overflow-hidden shadow-lg border border-emerald-500/30 bg-slate-900 p-1 mb-1">
          <Image
            src="/logo.webp"
            alt="Logo Aksara Stok"
            width={56}
            height={56}
            className="w-full h-full object-cover rounded-xl"
            priority
          />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-wider text-white uppercase">
            Aksara Stok Opname
          </h1>
          <p className="text-[11px] text-emerald-400/90 font-medium">
            PT Aksara Riksa Perdana
          </p>
        </div>

        {/* Badge Status Terkunci */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 text-[11px] text-slate-300 mt-2">
          {isSuccess ? (
            <>
              <Unlock className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-bold">Akses Diberikan</span>
            </>
          ) : (
            <>
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Aplikasi Terkunci</span>
            </>
          )}
        </div>
      </div>

      {/* Bagian Indikator 4 Digit PIN */}
      <div className="flex flex-col items-center space-y-3 my-4">
        <p className="text-xs text-slate-400 text-center">
          Masukkan PIN keamanan untuk membuka akses:
        </p>

        {/* 4 Titik PIN */}
        <div
          className={cn(
            "flex items-center gap-4 py-2 transition-transform",
            isError && "animate-pin-shake"
          )}
        >
          {[0, 1, 2, 3].map((index) => {
            const isFilled = pin.length > index;
            return (
              <div
                key={index}
                className={cn(
                  "w-4 h-4 rounded-full transition-all duration-150 border-2",
                  isError
                    ? "bg-rose-500 border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.6)]"
                    : isSuccess
                    ? "bg-emerald-400 border-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.8)] scale-110"
                    : isFilled
                    ? "bg-emerald-500 border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.5)] scale-110"
                    : "bg-slate-800/80 border-slate-600/80"
                )}
              />
            );
          })}
        </div>

        {/* Status Error / Notifikasi */}
        <div className="h-5 flex items-center justify-center">
          {isError && (
            <div className="flex items-center gap-1.5 text-xs text-rose-400 font-semibold animate-in fade-in duration-150">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>PIN salah, silakan coba lagi</span>
            </div>
          )}
          {isSuccess && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold animate-in fade-in duration-150">
              <Check className="w-3.5 h-3.5" />
              <span>Membuka aplikasi...</span>
            </div>
          )}
        </div>
      </div>

      {/* Papan Tombol Angka (Keypad) */}
      <div className="w-full max-w-xs space-y-3 pb-2">
        <div className="grid grid-cols-3 gap-3 sm:gap-4 justify-items-center">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              disabled={isError || isSuccess}
              className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 active:bg-emerald-600/80 active:scale-95 text-white font-mono text-2xl font-bold border border-slate-700/60 shadow-sm transition-all flex items-center justify-center touch-target disabled:opacity-50"
            >
              {digit}
            </button>
          ))}

          {/* Tombol Hapus Semua (Clear) */}
          <button
            type="button"
            onClick={handleClear}
            disabled={isError || isSuccess || pin.length === 0}
            className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-slate-900/60 hover:bg-slate-800/60 active:scale-95 text-slate-400 hover:text-slate-200 text-xs font-semibold border border-slate-800/60 transition-all flex items-center justify-center touch-target disabled:opacity-30"
          >
            Hapus
          </button>

          {/* Angka 0 */}
          <button
            type="button"
            onClick={() => handleDigit("0")}
            disabled={isError || isSuccess}
            className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 active:bg-emerald-600/80 active:scale-95 text-white font-mono text-2xl font-bold border border-slate-700/60 shadow-sm transition-all flex items-center justify-center touch-target disabled:opacity-50"
          >
            0
          </button>

          {/* Tombol Backspace */}
          <button
            type="button"
            onClick={handleBackspace}
            disabled={isError || isSuccess || pin.length === 0}
            aria-label="Hapus satu angka"
            className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-slate-900/60 hover:bg-slate-800/60 active:scale-95 text-slate-400 hover:text-slate-200 border border-slate-800/60 transition-all flex items-center justify-center touch-target disabled:opacity-30"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Footer Catatan Privasi & Keyboard Desktop */}
      <div className="flex flex-col items-center text-center space-y-1 text-slate-500 text-[11px] pt-2">
        <div className="flex items-center gap-1 text-slate-400">
          <Shield className="w-3 h-3 text-emerald-400/80" />
          <span>Keamanan Data Internal Aksara Stok</span>
        </div>
        <p className="text-[10px] text-slate-600 hidden sm:block">
          Desktop: Anda juga dapat mengetikkan angka langsung dari keyboard atau Numpad.
        </p>
      </div>
    </div>
  );
}
