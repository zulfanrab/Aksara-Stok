import { getPeople } from "@/lib/services/inventory";
import { KaryawanClient } from "./KaryawanClient";
import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";

export const metadata = {
  title: "Daftar Pengguna Barang (People) | PT Aksara Riksa Perdana",
  description: "Daftar 13 karyawan pengguna barang PT Aksara Riksa Perdana",
};

export default async function KaryawanPage() {
  const people = await getPeople();

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--slate-700)] flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6">
        <KaryawanClient initialPeople={people} />
      </main>
      <BottomNav />
    </div>
  );
}
