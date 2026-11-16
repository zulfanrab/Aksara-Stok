import { getItems, getCategories } from "@/lib/services/inventory";
import { BarangClient } from "./BarangClient";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";

export const metadata = {
  title: "Master Persediaan Barang | PT Aksara Riksa Perdana",
  description: "Daftar 128 master barang terstandarisasi PT Aksara Riksa Perdana",
};

export default async function BarangPage() {
  const [items, categories] = await Promise.all([
    getItems(),
    getCategories(),
  ]);

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--slate-700)] flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6">
        <BarangClient initialItems={items} categories={categories} />
      </main>
      <BottomNav />
    </div>
  );
}
