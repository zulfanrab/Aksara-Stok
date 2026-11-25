"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getPendingOutboxItems, removeOutboxItem, type OutboxRecord } from "./db";
import { syncOutboxToServer, notifyOutboxChanged } from "./sync";

export interface OfflineSyncState {
  isOnline: boolean;
  pendingCount: number;
  failedItems: OutboxRecord[];
  isSyncing: boolean;
  triggerSync: () => Promise<void>;
  dismissOutboxItem: (id: string) => Promise<void>;
}

export function useOfflineSync(): OfflineSyncState {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [failedItems, setFailedItems] = useState<OutboxRecord[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const refreshCount = useCallback(async () => {
    const allPending = await getPendingOutboxItems();
    setPendingCount(allPending.length);
    setFailedItems(allPending.filter((i) => i.status === "FAILED"));
  }, []);

  const dismissOutboxItem = useCallback(
    async (id: string) => {
      await removeOutboxItem(id);
      notifyOutboxChanged();
      await refreshCount();
    },
    [refreshCount]
  );

  const triggerSync = useCallback(async () => {
    if (typeof window === "undefined" || !navigator.onLine || isSyncing) {
      return;
    }
    setIsSyncing(true);
    try {
      const res = await syncOutboxToServer();
      await refreshCount();
      if (res.synced > 0) {
        router.refresh();
      }
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, refreshCount, router]);

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
    failedItems,
    isSyncing,
    triggerSync,
    dismissOutboxItem,
  };
}
