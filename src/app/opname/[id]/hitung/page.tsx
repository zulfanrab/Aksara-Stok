import { notFound } from "next/navigation";
import { getStockTakeById, getPeople } from "@/lib/services/inventory";
import { HitungClient } from "./HitungClient";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";

export const metadata = {
  title: "Hitung Buta Sesi Opname | PT Aksara Riksa Perdana",
  description: "Antarmuka hitung buta fisik barang per item",
};

export default async function HitungPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [{ stockTake, lines }, people] = await Promise.all([
    getStockTakeById(id),
    getPeople(),
  ]);

  if (!stockTake) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--slate-700)] flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6">
        <HitungClient
          stockTake={stockTake}
          lines={lines}
          people={people}
        />
      </main>
      <BottomNav />
    </div>
  );
}
