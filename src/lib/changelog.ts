export interface ReleasePoint {
  text: string;
}

export interface ReleaseLog {
  version: string;
  date: string; // Format: "18 November 2026"
  title: string;
  points: string[]; // Maksimal 5 poin sederhana
}

// Versi aplikasi saat ini
export const APP_VERSION = "1.1.0";

// Riwayat pembaruan aplikasi Aksara Stok
export const RELEASES: ReleaseLog[] = [
  {
    version: "1.1.0",
    date: "18 November 2026",
    title: "Pembaruan Aksara Stok v1.1.0",
    points: [
      "Beranda baru yang lebih ringkas dengan 3 tombol utama dan kartu status stok.",
      "Menu navigasi bawah 5 tombol untuk HP dan tombol bantuan cepat (?) di header.",
      "Halaman Panduan praktis 3 langkah untuk pemakaian barang, belanja, dan opname.",
      "Istilah teknis diganti menjadi bahasa operasional sehari-hari yang mudah dipahami.",
      "Fitur tambah, ubah, dan arsipkan barang baru untuk Admin dengan nomor otomatis.",
    ],
  },
  {
    version: "1.0.0",
    date: "16 November 2026",
    title: "Peluncuran Awal Aksara Stok",
    points: [
      "Pencatatan barang keluar untuk operasional proyek dan kantor.",
      "Pencatatan barang masuk dari pembelian supplier.",
      "Pelaksanaan stock opname fisik (hitung buta) di gudang.",
      "Rekapitulasi stok dan ekspor laporan resmi Excel, Word, serta cetak A4.",
    ],
  },
];
