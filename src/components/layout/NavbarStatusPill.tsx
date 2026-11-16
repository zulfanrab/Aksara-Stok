"use client";

import { Wifi, WifiOff } from "lucide-react";
import { useOfflineSync } from "@/lib/offline/useOfflineSync";

export function NavbarStatusPill() {
  const { isOnline, pendingCount } = useOfflineSync();

  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
          isOnline
            ? "bg-[var(--emerald-50)] border-[var(--emerald-500)]/20 text-[var(--emerald-700)]"
            : "bg-amber-50 border-amber-300 text-amber-800"
        }`}
      >
        <span
          className={`w-2 h-2 rounded-full ${
            isOnline ? "bg-[var(--emerald-500)] animate-pulse" : "bg-amber-500"
          }`}
        />
        <span>{isOnline ? "Online" : "Offline"}</span>
      </div>

      {pendingCount > 0 && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold num-mono border border-amber-200">
          {pendingCount}
        </span>
      )}
    </div>
  );
}
