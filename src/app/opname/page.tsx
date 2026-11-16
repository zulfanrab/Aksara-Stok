import { getStockTakes, getProfiles, getCategories } from "@/lib/services/inventory";
import { OpnameClient } from "./OpnameClient";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";

export const metadata = {
  title: "Sesi Stock Opname | PT Aksara Riksa Perdana",
  description: "Manajemen sesi stock opname bulanan dan audit fisik",
};

export default async function OpnamePage() {
  const [stockTakes, profiles, categories] = await Promise.all([
    getStockTakes(),
    getProfiles(),
    getCategories(),
  ]);

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--slate-700)] flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6">
        <OpnameClient
          stockTakes={stockTakes}
          profiles={profiles}
          categories={categories}
        />
      </main>
      <BottomNav />
    </div>
  );
}
