import { connection } from "next/server";
import { getItems, getUnits, getUnitConversions } from "@/lib/services/inventory";
import { MasukClient } from "./MasukClient";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";

export const metadata = {
  title: "Catat Penerimaan Barang (Masuk) | PT Aksara Riksa Perdana",
  description: "Pencatatan barang masuk dengan konversi satuan kemasan",
};

interface MasukPageProps {
  searchParams?: Promise<{ itemId?: string }>;
}

export default async function MasukPage({ searchParams }: MasukPageProps) {
  await connection();
  const resolvedParams = searchParams ? await searchParams : {};
  const [items, units, conversions] = await Promise.all([
    getItems(),
    getUnits(),
    getUnitConversions(),
  ]);

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--slate-700)] flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6">
        <MasukClient
          items={items}
          units={units}
          conversions={conversions}
          initialItemId={resolvedParams.itemId}
        />
      </main>
      <BottomNav />
    </div>
  );
}
