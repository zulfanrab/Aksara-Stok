import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";
import { PanduanClient } from "./PanduanClient";

export const metadata = {
  title: "Panduan Penggunaan | PT Aksara Riksa Perdana",
  description: "Panduan praktis langkah demi langkah pencatatan stok dan opname fisik",
};

export default function PanduanPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-slate-800 flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 pb-24 md:pb-12">
        <PanduanClient />
      </main>
      <BottomNav />
    </div>
  );
}
