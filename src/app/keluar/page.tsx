import { connection } from "next/server";
import { getItems, getPeople, getProjects, getCurrentStockMap } from "@/lib/services/inventory";
import { KeluarClient } from "./KeluarClient";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";

export const metadata = {
  title: "Catat Pengeluaran Barang | PT Aksara Riksa Perdana",
  description: "Form pencatatan barang keluar dan pemakaian lapangan",
};

interface KeluarPageProps {
  searchParams?: Promise<{ itemId?: string }>;
}

export default async function KeluarPage({ searchParams }: KeluarPageProps) {
  await connection();
  const resolvedParams = searchParams ? await searchParams : {};
  const [items, people, projects, stockMap] = await Promise.all([
    getItems(),
    getPeople(),
    getProjects(),
    getCurrentStockMap(),
  ]);

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--slate-700)] flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6">
        <KeluarClient
          items={items}
          people={people}
          projects={projects}
          stockMap={stockMap}
          initialItemId={resolvedParams.itemId}
        />
      </main>
      <BottomNav />
    </div>
  );
}
