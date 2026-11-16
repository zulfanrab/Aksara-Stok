import { getMovements } from "@/lib/services/inventory";
import { RiwayatClient } from "./RiwayatClient";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";

export const metadata = {
  title: "Riwayat Pergerakan Stok | PT Aksara Riksa Perdana",
  description: "Log mutasi ledger stok append-only dan koreksi pembalik",
};

export default async function RiwayatPage() {
  const movements = await getMovements(100);

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--slate-700)] flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6">
        <RiwayatClient initialMovements={movements} />
      </main>
      <BottomNav />
    </div>
  );
}
