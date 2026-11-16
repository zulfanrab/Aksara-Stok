import { getItems, getCategories, getUnits } from "@/lib/services/inventory";
import { BarangClient } from "./BarangClient";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";

export const metadata = {
  title: "Master Persediaan Barang | PT Aksara Riksa Perdana",
  description: "Daftar master barang dan inventaris PT Aksara Riksa Perdana",
};

export default async function BarangPage() {
  const [items, categories, units] = await Promise.all([
    getItems(),
    getCategories(),
    getUnits(),
  ]);

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--slate-700)] flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6">
        <BarangClient initialItems={items} categories={categories} units={units} />
      </main>
      <BottomNav />
    </div>
  );
}
