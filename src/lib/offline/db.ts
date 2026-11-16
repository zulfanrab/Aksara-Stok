/**
 * IndexedDB Wrapper untuk Penyimpanan Offline & Antrean Outbox
 * PT Aksara Riksa Perdana
 */

export type OutboxActionType = "STOCK_OUT" | "STOCK_IN" | "STOCK_COUNT" | "STOCK_RECOUNT";

export interface OutboxRecord {
  id: string; // UUID v4 dari klien
  actionType: OutboxActionType;
  payload: Record<string, unknown>;
  createdAt: string;
  retryCount: number;
  status: "PENDING" | "SYNCING" | "FAILED";
  errorMessage?: string;
}

export interface MasterCacheRecord<T = unknown> {
  key: string;
  data: T;
  updatedAt: string;
}

const DB_NAME = "AksaraStokDB";
const DB_VERSION = 1;
const STORE_OUTBOX = "outbox";
const STORE_CACHE = "master_cache";

/**
 * Membuka atau menginisialisasi database IndexedDB
 */
export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB tidak didukung pada lingkungan ini."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 1. Store Outbox untuk antrean mutasi
      if (!db.objectStoreNames.contains(STORE_OUTBOX)) {
        const outboxStore = db.createObjectStore(STORE_OUTBOX, { keyPath: "id" });
        outboxStore.createIndex("status", "status", { unique: false });
        outboxStore.createIndex("createdAt", "createdAt", { unique: false });
      }

      // 2. Store Cache untuk master data & saldo
      if (!db.objectStoreNames.contains(STORE_CACHE)) {
        db.createObjectStore(STORE_CACHE, { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ==========================================
// OUTBOX QUEUE OPERATIONS
// ==========================================

/**
 * Menambahkan rekaman aksi ke antrean outbox lokal
 */
export async function enqueueOutboxItem(
  actionType: OutboxActionType,
  payload: Record<string, unknown>,
  customId?: string
): Promise<OutboxRecord> {
  const db = await openDB();
  const id = customId || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "offline-" + Date.now());

  const record: OutboxRecord = {
    id,
    actionType,
    payload,
    createdAt: new Date().toISOString(),
    retryCount: 0,
    status: "PENDING",
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_OUTBOX, "readwrite");
    const store = tx.objectStore(STORE_OUTBOX);
    const req = store.put(record);

    req.onsuccess = () => resolve(record);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Mengambil semua antrean outbox dengan status PENDING atau FAILED, berurutan FIFO (createdAt ascending)
 */
export async function getPendingOutboxItems(): Promise<OutboxRecord[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_OUTBOX, "readonly");
      const store = tx.objectStore(STORE_OUTBOX);
      const req = store.getAll();

      req.onsuccess = () => {
        const items = (req.result as OutboxRecord[]) || [];
        const pending = items
          .filter((item) => item.status === "PENDING" || item.status === "FAILED")
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        resolve(pending);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("Gagal membaca outbox items:", err);
    return [];
  }
}

/**
 * Menghitung jumlah antrean outbox yang belum tersinkron
 */
export async function getOutboxCount(): Promise<number> {
  try {
    const pending = await getPendingOutboxItems();
    return pending.length;
  } catch {
    return 0;
  }
}

/**
 * Memperbarui status antrean outbox
 */
export async function updateOutboxStatus(
  id: string,
  status: "PENDING" | "SYNCING" | "FAILED",
  errorMessage?: string
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_OUTBOX, "readwrite");
    const store = tx.objectStore(STORE_OUTBOX);
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const item = getReq.result as OutboxRecord | undefined;
      if (!item) {
        resolve();
        return;
      }
      item.status = status;
      if (status === "FAILED") {
        item.retryCount = (item.retryCount || 0) + 1;
        item.errorMessage = errorMessage;
      }
      const putReq = store.put(item);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

/**
 * Menghapus antrean outbox setelah berhasil disinkronkan ke server
 */
export async function removeOutboxItem(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_OUTBOX, "readwrite");
    const store = tx.objectStore(STORE_OUTBOX);
    const req = store.delete(id);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ==========================================
// MASTER DATA CACHE OPERATIONS
// ==========================================

/**
 * Menyimpan data master ke cache IndexedDB
 */
export async function setCachedMasterData<T>(key: string, data: T): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CACHE, "readwrite");
      const store = tx.objectStore(STORE_CACHE);
      const record: MasterCacheRecord<T> = {
        key,
        data,
        updatedAt: new Date().toISOString(),
      };
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("Gagal menyimpan cache master:", key, err);
  }
}

/**
 * Mengambil data master dari cache IndexedDB
 */
export async function getCachedMasterData<T>(key: string): Promise<T | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CACHE, "readonly");
      const store = tx.objectStore(STORE_CACHE);
      const req = store.get(key);

      req.onsuccess = () => {
        const result = req.result as MasterCacheRecord<T> | undefined;
        resolve(result ? result.data : null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("Gagal membaca cache master:", key, err);
    return null;
  }
}
