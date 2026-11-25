import { createAdminClient } from "@/lib/supabase/admin";
import { getItems, getPeople, getProjects, getMovements, getCurrentStockMap } from "./inventory";
import { evaluateStockStatus, type StockStatus } from "@/lib/stock-logic";
import type { Item, Person, Project } from "@/types/inventory";

export interface StockSummaryItem {
  id: string;
  code: string;
  name: string;
  categoryName: string;
  categoryCode: string;
  locationName?: string;
  unitName: string;
  currentStock: number;
  minStock: number;
  targetStock: number;
  status: StockStatus | "BELUM_DIHITUNG" | string;
  kind: string;
  photo_path?: string | null;
}

export interface PersonUsageItemBreakdown {
  itemId: string;
  itemCode: string;
  itemName: string;
  unitName: string;
  totalQty: number;
  transactionCount: number;
}

export interface PersonUsageSummary {
  person: Person;
  totalTransactions: number;
  totalQuantity: number;
  itemsBreakdown: PersonUsageItemBreakdown[];
}

export interface ProjectUsageSummary {
  project: Project;
  totalTransactions: number;
  totalQuantity: number;
  itemsBreakdown: {
    itemId: string;
    itemCode: string;
    itemName: string;
    unitName: string;
    totalQty: number;
  }[];
}

export interface InventoryMetrics {
  totalItems: number;
  totalCategories: number;
  amanCount: number;
  menipisCount: number;
  habisCount: number;
  totalOutMovements: number;
  activePeopleCount: number;
}

type UsageMovementInput = {
  id: string;
  item_id: string;
  type: string;
  qty: number;
  person_id?: string | null;
  project_id?: string | null;
  item?: { code: string; name: string; unit?: { name: string } } | null;
};

function aggregateUsageByKey<TEntity extends { id: string }>(
  movements: UsageMovementInput[],
  entities: TEntity[],
  getKey: (m: UsageMovementInput) => string | null | undefined
) {
  const entityMap = new Map<string, TEntity>();
  entities.forEach((e) => entityMap.set(e.id, e));

  const usageMap = new Map<
    string,
    {
      totalTransactions: number;
      totalQuantity: number;
      items: Map<string, PersonUsageItemBreakdown>;
    }
  >();

  entities.forEach((e) => {
    usageMap.set(e.id, {
      totalTransactions: 0,
      totalQuantity: 0,
      items: new Map(),
    });
  });

  // Hitung mutasi OUT serta kurangi mutasi REVERSAL atas OUT (qty < 0)
  for (const mov of movements) {
    const entityId = getKey(mov);
    if (!entityId) continue;

    const isOut = mov.type === "OUT";
    const isOutReversal = mov.type === "REVERSAL" && Number(mov.qty) < 0;
    if (!isOut && !isOutReversal) continue;

    let entry = usageMap.get(entityId);
    if (!entry) {
      entry = { totalTransactions: 0, totalQuantity: 0, items: new Map() };
      usageMap.set(entityId, entry);
    }

    const deltaQty = isOut ? Number(mov.qty) : -Math.abs(Number(mov.qty));
    const deltaTx = isOut ? 1 : -1;

    entry.totalTransactions = Math.max(0, entry.totalTransactions + deltaTx);
    entry.totalQuantity = Math.max(0, Number((entry.totalQuantity + deltaQty).toFixed(4)));

    const itemId = mov.item_id;
    const existingItem = entry.items.get(itemId);
    const itemCode = mov.item?.code || "-";
    const itemName = mov.item?.name || "Barang " + itemId;
    const unitName = mov.item?.unit?.name || "Unit";

    if (existingItem) {
      existingItem.totalQty = Math.max(0, Number((existingItem.totalQty + deltaQty).toFixed(4)));
      existingItem.transactionCount = Math.max(0, existingItem.transactionCount + deltaTx);
    } else if (deltaQty > 0) {
      entry.items.set(itemId, {
        itemId,
        itemCode,
        itemName,
        unitName,
        totalQty: deltaQty,
        transactionCount: 1,
      });
    }
  }

  return { entityMap, usageMap };
}

/**
 * Fungsi Murni: Agregasi pemakaian barang per orang (Pengguna Barang / people)
 */
export function aggregateUsageByPerson(
  movements: Array<{
    id: string;
    item_id: string;
    type: string;
    qty: number;
    person_id: string | null;
    item?: { code: string; name: string; unit?: { name: string } } | null;
  }>,
  people: Person[]
): PersonUsageSummary[] {
  const { entityMap, usageMap } = aggregateUsageByKey(movements, people, (m) => m.person_id);

  const result: PersonUsageSummary[] = [];
  usageMap.forEach((val, personId) => {
    const person = entityMap.get(personId);
    if (person) {
      const itemsBreakdown = Array.from(val.items.values())
        .filter((i) => i.totalQty > 0)
        .sort((a, b) => b.totalQty - a.totalQty);
      result.push({
        person,
        totalTransactions: val.totalTransactions,
        totalQuantity: val.totalQuantity,
        itemsBreakdown,
      });
    }
  });

  return result.sort((a, b) => b.totalQuantity - a.totalQuantity);
}

/**
 * Fungsi Murni: Agregasi pemakaian barang per proyek / klien
 */
export function aggregateUsageByProject(
  movements: Array<{
    id: string;
    item_id: string;
    type: string;
    qty: number;
    project_id: string | null;
    item?: { code: string; name: string; unit?: { name: string } } | null;
  }>,
  projects: Project[]
): ProjectUsageSummary[] {
  const { entityMap, usageMap } = aggregateUsageByKey(movements, projects, (m) => m.project_id);

  const result: ProjectUsageSummary[] = [];
  usageMap.forEach((val, projectId) => {
    const project = entityMap.get(projectId);
    if (project) {
      const itemsBreakdown = Array.from(val.items.values())
        .filter((i) => i.totalQty > 0)
        .sort((a, b) => b.totalQty - a.totalQty)
        .map(({ itemId, itemCode, itemName, unitName, totalQty }) => ({
          itemId,
          itemCode,
          itemName,
          unitName,
          totalQty,
        }));
      result.push({
        project,
        totalTransactions: val.totalTransactions,
        totalQuantity: val.totalQuantity,
        itemsBreakdown,
      });
    }
  });

  return result.sort((a, b) => b.totalQuantity - a.totalQuantity);
}

/**
 * Fungsi Murni: Menghitung metrik ringkasan inventaris
 */
export function calculateInventoryMetrics(
  items: Item[],
  stockMap: Record<string, number>,
  outMovementsCount: number = 0,
  activePeopleCount: number = 0
): InventoryMetrics {
  let amanCount = 0;
  let menipisCount = 0;
  let habisCount = 0;

  const categoriesSet = new Set<string>();

  for (const item of items) {
    if (item.category_id) {
      categoriesSet.add(item.category_id);
    }
    const currentStock = stockMap[item.id] || 0;
    const status = evaluateStockStatus(currentStock, item.min_stock);

    if (status === "HABIS") {
      habisCount += 1;
    } else if (status === "MENIPIS") {
      menipisCount += 1;
    } else {
      amanCount += 1;
    }
  }

  return {
    totalItems: items.length,
    totalCategories: categoriesSet.size,
    amanCount,
    menipisCount,
    habisCount,
    totalOutMovements: outMovementsCount,
    activePeopleCount,
  };
}

/**
 * Service: Mengambil data lengkap rekapitulasi inventaris
 */
export async function getInventoryReportData() {
  const [items, people, projects, allMovements, stockMap] = await Promise.all([
    getItems(),
    getPeople(),
    getProjects(),
    getMovements(2000),
    getCurrentStockMap(),
  ]);

  // 1. Rekapitulasi Stok Terkini
  const stockSummary: StockSummaryItem[] = items.map((item) => {
    const currentStock = stockMap[item.id] || 0;
    const status = evaluateStockStatus(currentStock, item.min_stock);
    return {
      id: item.id,
      code: item.code,
      name: item.name,
      categoryName: item.category?.name || "Lainnya",
      categoryCode: item.category?.code || "-",
      locationName: item.location?.name || "-",
      unitName: item.unit?.name || "Pcs",
      currentStock,
      minStock: item.min_stock,
      targetStock: item.target_stock,
      status,
      kind: item.kind,
      photo_path: item.photo_path || null,
    };
  });

  // 2. Pemakaian per Karyawan (13 Orang)
  const personUsage = aggregateUsageByPerson(allMovements, people);

  // 3. Pemakaian per Proyek
  const projectUsage = aggregateUsageByProject(allMovements, projects);

  // 4. Metrik Ringkasan
  const outMovements = allMovements.filter((m) => m.type === "OUT");
  const reversedOutCount = allMovements.filter((m) => m.type === "REVERSAL" && Number(m.qty) < 0).length;
  const activePeopleWithUsage = personUsage.filter((p) => p.totalQuantity > 0).length;

  const metrics = calculateInventoryMetrics(
    items,
    stockMap,
    Math.max(0, outMovements.length - reversedOutCount),
    activePeopleWithUsage
  );

  return {
    stockSummary,
    personUsage,
    projectUsage,
    metrics,
    recentMovements: allMovements.slice(0, 50),
    printDate: new Date().toISOString(),
  };
}
