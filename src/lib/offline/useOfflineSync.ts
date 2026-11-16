"use client";

import { useState, useEffect, useCallback } from "react";
import { getOutboxCount } from "./db";
import { syncOutboxToServer, notifyOutboxChanged } from "./sync";

export interface OfflineSyncState {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  triggerSync: () => Promise<void>;
}

export function useOfflineSync(): OfflineSyncState {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const refreshCount = useCallback(async () => {
    const count = await getOutboxCount();
    setPendingCount(count);
  }, []);

  const triggerSync = useCallback(async () => {
    if (typeof window === "undefined" || !navigator.onLine || isSyncing) {
      return;
    }
    setIsSyncing(true);
    try {
      await syncOutboxToServer();
      await refreshCount();
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, refreshCount]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(navigator.onLine);
    refreshCount();

    const handleOnline = () => {
      setIsOnline(true);
      // Sinkronisasi otomatis saat internet kembali tersambung
      triggerSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleOutboxChange = () => {
      refreshCount();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("aksara:outbox-updated", handleOutboxChange);

    // Refresh count periodic (misal setiap 10 detik)
    const interval = setInterval(refreshCount, 10000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("aksara:outbox-updated", handleOutboxChange);
      clearInterval(interval);
    };
  }, [refreshCount, triggerSync]);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    triggerSync,
  };
}
