import { getInventoryReportData } from "@/lib/services/reports";
import { LaporanClient } from "./LaporanClient";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";

export const metadata = {
  title: "Laporan Inventaris & Pemakaian | PT Aksara Riksa Perdana",
  description: "Rekapitulasi stok, analisis pemakaian per karyawan dan proyek, serta ekspor Excel, Word, dan PDF.",
};

export default async function LaporanPage() {
  const reportData = await getInventoryReportData();

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--slate-700)] flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-5 pb-24 md:pb-12">
        <LaporanClient data={reportData} />
      </main>

      <BottomNav />
    </div>
  );
}
