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
  unitName: string;
  currentStock: number;
  minStock: number;
  targetStock: number;
  status: StockStatus;
  kind: string;
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
  const personMap = new Map<string, Person>();
  people.forEach((p) => personMap.set(p.id, p));

  const usageMap = new Map<
    string,
    {
      totalTransactions: number;
      totalQuantity: number;
      items: Map<string, PersonUsageItemBreakdown>;
    }
  >();

  // Inisialisasi map untuk setiap orang di tabel people
  people.forEach((p) => {
    usageMap.set(p.id, {
      totalTransactions: 0,
      totalQuantity: 0,
      items: new Map(),
    });
  });

  // Filter hanya mutasi OUT (Pengeluaran Barang)
  const outMovements = movements.filter((m) => m.type === "OUT" && m.person_id);

  for (const mov of outMovements) {
    const personId = mov.person_id!;
    let entry = usageMap.get(personId);
    if (!entry) {
      entry = { totalTransactions: 0, totalQuantity: 0, items: new Map() };
      usageMap.set(personId, entry);
    }

    entry.totalTransactions += 1;
    entry.totalQuantity += Number(mov.qty);

    const itemId = mov.item_id;
    const existingItem = entry.items.get(itemId);
    const itemCode = mov.item?.code || "-";
    const itemName = mov.item?.name || "Barang " + itemId;
    const unitName = mov.item?.unit?.name || "Unit";

    if (existingItem) {
      existingItem.totalQty += Number(mov.qty);
      existingItem.transactionCount += 1;
    } else {
      entry.items.set(itemId, {
        itemId,
        itemCode,
        itemName,
        unitName,
        totalQty: Number(mov.qty),
        transactionCount: 1,
      });
    }
  }

  // Bentuk array summary terurut berdasarkan total pemakaian terbanyak
  const result: PersonUsageSummary[] = [];
  usageMap.forEach((val, personId) => {
    const person = personMap.get(personId);
    if (person) {
      const itemsBreakdown = Array.from(val.items.values()).sort(
        (a, b) => b.totalQty - a.totalQty
      );
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
  const projectMap = new Map<string, Project>();
  projects.forEach((pr) => projectMap.set(pr.id, pr));

  const usageMap = new Map<
    string,
    {
      totalTransactions: number;
      totalQuantity: number;
      items: Map<
        string,
        {
          itemId: string;
          itemCode: string;
          itemName: string;
          unitName: string;
          totalQty: number;
        }
      >;
    }
  >();

  projects.forEach((pr) => {
    usageMap.set(pr.id, {
      totalTransactions: 0,
      totalQuantity: 0,
      items: new Map(),
    });
  });

  const outMovements = movements.filter((m) => m.type === "OUT" && m.project_id);

  for (const mov of outMovements) {
    const projectId = mov.project_id!;
    let entry = usageMap.get(projectId);
    if (!entry) {
      entry = { totalTransactions: 0, totalQuantity: 0, items: new Map() };
      usageMap.set(projectId, entry);
    }

    entry.totalTransactions += 1;
    entry.totalQuantity += Number(mov.qty);

    const itemId = mov.item_id;
    const existing = entry.items.get(itemId);
    const itemCode = mov.item?.code || "-";
    const itemName = mov.item?.name || "Barang";
    const unitName = mov.item?.unit?.name || "Unit";

    if (existing) {
      existing.totalQty += Number(mov.qty);
    } else {
      entry.items.set(itemId, {
        itemId,
        itemCode,
        itemName,
        unitName,
        totalQty: Number(mov.qty),
      });
    }
  }

  const result: ProjectUsageSummary[] = [];
  usageMap.forEach((val, projectId) => {
    const project = projectMap.get(projectId);
    if (project) {
      result.push({
        project,
        totalTransactions: val.totalTransactions,
        totalQuantity: val.totalQuantity,
        itemsBreakdown: Array.from(val.items.values()).sort(
          (a, b) => b.totalQty - a.totalQty
        ),
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
    getMovements(500),
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
      unitName: item.unit?.name || "Pcs",
      currentStock,
      minStock: item.min_stock,
      targetStock: item.target_stock,
      status,
      kind: item.kind,
    };
  });

  // 2. Pemakaian per Karyawan (13 Orang)
  const personUsage = aggregateUsageByPerson(allMovements, people);

  // 3. Pemakaian per Proyek
  const projectUsage = aggregateUsageByProject(allMovements, projects);

  // 4. Metrik Ringkasan
  const outMovements = allMovements.filter((m) => m.type === "OUT");
  const uniquePeopleWithUsage = new Set(outMovements.map((m) => m.person_id).filter(Boolean)).size;

  const metrics = calculateInventoryMetrics(
    items,
    stockMap,
    outMovements.length,
    uniquePeopleWithUsage
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
