import { getInventoryReportData } from "@/lib/services/reports";
import { CetakClient } from "./CetakClient";

export const metadata = {
  title: "Cetak Dokumen Resmi A4 | PT Aksara Riksa Perdana",
  description: "Format cetak resmi A4 berkop untuk rekapitulasi inventaris dan pemakaian",
};

interface CetakPageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function CetakPage({ searchParams }: CetakPageProps) {
  const resolvedParams = await searchParams;
  const tab = resolvedParams.tab || "stock";
  const reportData = await getInventoryReportData();

  return <CetakClient data={reportData} activeTab={tab.toUpperCase()} />;
}
