import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getStockTakeById, getProfiles } from "@/lib/services/inventory";
import { ReviewClient } from "./ReviewClient";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";

export const metadata = {
  title: "Review Sesi Stock Opname | PT Aksara Riksa Perdana",
  description: "Review selisih hitung fisik, persetujuan, dan penyesuaian stok",
};

export default async function OpnameDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await connection();
  const { id } = await params;
  const [{ stockTake, lines }, profiles] = await Promise.all([
    getStockTakeById(id),
    getProfiles(),
  ]);

  if (!stockTake) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--slate-700)] flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6">
        <ReviewClient
          stockTake={stockTake}
          lines={lines}
          profiles={profiles}
        />
      </main>
      <BottomNav />
    </div>
  );
}
