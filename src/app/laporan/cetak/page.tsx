import { connection } from "next/server";
import { getInventoryReportData } from "@/lib/services/reports";
import { CetakClient } from "./CetakClient";

export const metadata = {
  title: "Cetak Dokumen Resmi A4 | PT Aksara Riksa Perdana",
  description: "Format cetak resmi A4 berkop untuk rekapitulasi inventaris dan pemakaian",
};

interface CetakPageProps {
  searchParams?: Promise<{
    tab?: string;
    status?: string;
    category?: string;
    q?: string;
  }>;
}

export default async function CetakPage({ searchParams }: CetakPageProps) {
  await connection();
  const resolvedParams = searchParams ? await searchParams : {};
  const tab = (resolvedParams.tab || "stock").toUpperCase();
  const reportData = await getInventoryReportData();

  return (
    <CetakClient
      data={reportData}
      activeTab={tab}
      initialStatus={(resolvedParams.status || "ALL").toUpperCase()}
      initialCategory={(resolvedParams.category || "ALL").toUpperCase()}
      initialQuery={resolvedParams.q || ""}
    />
  );
}
