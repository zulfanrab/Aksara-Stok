import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getStockTakeById } from "@/lib/services/inventory";
import { BeritaAcaraClient } from "./BeritaAcaraClient";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";

export const metadata = {
  title: "Berita Acara Stock Opname Resmi | PT Aksara Riksa Perdana",
  description: "Dokumen resmi Berita Acara hasil stock opname fisik persediaan",
};

export default async function BeritaAcaraPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id } = await params;
  const { stockTake, lines } = await getStockTakeById(id);

  if (!stockTake) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--slate-700)] flex flex-col">
      <div className="print:hidden">
        <Navbar />
      </div>
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6">
        <BeritaAcaraClient stockTake={stockTake} lines={lines} />
      </main>
      <div className="print:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
