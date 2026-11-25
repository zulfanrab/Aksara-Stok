import { connection } from "next/server";
import {
  getItems,
  getCategories,
  getUnits,
  getLocations,
  getCurrentStockMap,
} from "@/lib/services/inventory";
import { evaluateStockStatus } from "@/lib/stock-logic";
import { BarangClient } from "./BarangClient";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";

export const metadata = {
  title: "Master Persediaan Barang | PT Aksara Riksa Perdana",
  description: "Daftar master barang dan inventaris PT Aksara Riksa Perdana",
};

interface BarangPageProps {
  searchParams?: Promise<{ filter?: string }>;
}

export default async function BarangPage({ searchParams }: BarangPageProps) {
  await connection();
  const resolvedParams = searchParams ? await searchParams : {};
  const rawFilter = (resolvedParams.filter || "ALL").toUpperCase();
  const initialStatusFilter =
    rawFilter === "HABIS" || rawFilter === "MENIPIS" || rawFilter === "AMAN"
      ? rawFilter
      : "ALL";

  const [rawItems, categories, units, locations, stockMap] = await Promise.all([
    getItems({ includeInactive: true }),
    getCategories(),
    getUnits(),
    getLocations(),
    getCurrentStockMap(),
  ]);

  const items = rawItems.map((item) => {
    const qty = stockMap[item.id] ?? 0;
    return {
      ...item,
      current_qty: qty,
      stock_status: evaluateStockStatus(qty, Number(item.min_stock || 0)),
    };
  });

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--slate-700)] flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6">
        <BarangClient
          initialItems={items}
          categories={categories}
          units={units}
          locations={locations}
          initialStatusFilter={initialStatusFilter}
        />
      </main>
      <BottomNav />
    </div>
  );
}
