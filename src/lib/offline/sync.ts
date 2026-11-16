/**
 * Sync Engine untuk Sinkronisasi Antrean Outbox ke Server
 * PT Aksara Riksa Perdana
 */

import {
  getPendingOutboxItems,
  updateOutboxStatus,
  removeOutboxItem,
  type OutboxRecord,
} from "./db";
import { recordStockOutAction, recordStockInAction } from "@/lib/actions/stock";
import { submitCountLineAction, submitRecountLineAction } from "@/lib/actions/opname";

export interface SyncResult {
  total: number;
  synced: number;
  failed: number;
  errors: string[];
}

/**
 * Memicu event browser lokal agar seluruh UI sinkron dengan jumlah antrean outbox terbaru
 */
export function notifyOutboxChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("aksara:outbox-updated"));
  }
}

/**
 * Memproses dan mengirim seluruh antrean outbox ke backend Supabase
 */
export async function syncOutboxToServer(): Promise<SyncResult> {
  const pendingItems = await getPendingOutboxItems();
  const result: SyncResult = {
    total: pendingItems.length,
    synced: 0,
    failed: 0,
    errors: [],
  };

  if (pendingItems.length === 0) {
    notifyOutboxChanged();
    return result;
  }

  for (const item of pendingItems) {
    try {
      await updateOutboxStatus(item.id, "SYNCING");

      let actionRes: { success: boolean; error?: string } = { success: false, error: "Tipe aksi tidak dikenal" };

      switch (item.actionType) {
        case "STOCK_OUT": {
          actionRes = await recordStockOutAction({
            clientUuid: item.id,
            itemId: item.payload.itemId as string,
            qty: Number(item.payload.qty),
            personId: item.payload.personId as string,
            projectId: (item.payload.projectId as string) || null,
            locationId: (item.payload.locationId as string) || null,
            note: (item.payload.note as string) || null,
            occurredAt: (item.payload.occurredAt as string) || item.createdAt,
          });
          break;
        }

        case "STOCK_IN": {
          actionRes = await recordStockInAction({
            clientUuid: item.id,
            itemId: item.payload.itemId as string,
            qtyBuy: Number(item.payload.qtyBuy),
            buyUnitId: item.payload.buyUnitId as string,
            qtyBase: Number(item.payload.qtyBase),
            unitPrice: item.payload.unitPrice ? Number(item.payload.unitPrice) : undefined,
            supplier: (item.payload.supplier as string) || null,
            invoiceNo: (item.payload.invoiceNo as string) || null,
            locationId: (item.payload.locationId as string) || null,
            receiptPath: (item.payload.receiptPath as string) || null,
            note: (item.payload.note as string) || null,
            occurredAt: (item.payload.occurredAt as string) || item.createdAt,
          });
          break;
        }

        case "STOCK_COUNT": {
          actionRes = await submitCountLineAction({
            lineId: item.payload.lineId as string,
            countedQty: Number(item.payload.countedQty),
            countedByPersonId: item.payload.countedByPersonId as string,
          });
          break;
        }

        case "STOCK_RECOUNT": {
          actionRes = await submitRecountLineAction({
            lineId: item.payload.lineId as string,
            recountQty: Number(item.payload.recountQty),
            reason: (item.payload.reason as string) || "Koreksi fisik offline",
          });
          break;
        }
      }

      if (actionRes.success) {
        await removeOutboxItem(item.id);
        result.synced += 1;
      } else {
        await updateOutboxStatus(item.id, "FAILED", actionRes.error);
        result.failed += 1;
        result.errors.push(actionRes.error || "Gagal sinkron");
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Kesalahan jaringan";
      await updateOutboxStatus(item.id, "FAILED", errMsg);
      result.failed += 1;
      result.errors.push(errMsg);
    }
  }

  notifyOutboxChanged();
  return result;
}
