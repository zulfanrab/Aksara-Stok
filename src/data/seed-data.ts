export interface SeedPerson {
  employee_code: string;
  name: string;
  position: string;
}

export interface SeedCategory {
  code: string;
  name: string;
  kind: "CONSUMABLE" | "PPE" | "INSTRUMENT" | "SERVICE";
}

export interface SeedItem {
  code: string;
  legacy_code?: string;
  name: string;
  category_code: string;
  kind: "CONSUMABLE" | "PPE" | "INSTRUMENT" | "SERVICE";
  unit_name: string;
  min_stock: number;
  target_stock: number;
  abc_class?: "A" | "B" | "C";
  has_expiry?: boolean;
}

export interface SeedUnitConversion {
  item_code: string;
  from_unit: string;
  to_unit: string;
  factor: number;
}

export const SEED_PEOPLE: SeedPerson[] = [
  { employee_code: "20240904002", name: "Arya Rizki P., S.Tr.Kom.", position: "Technical Support Officer" },
  { employee_code: "20220905001", name: "M. Fazar Maulana (Ajay)", position: "Technical Administration Officer" },
  { employee_code: "20260904005", name: "Aulia Zahra D., S.Tr.M", position: "Finance Administration Officer" },
  { employee_code: "20261004006", name: "Marsya Aulia R., S.Kep.", position: "HR & General Affairs Officer" },
  { employee_code: "20250404001", name: "Rio Adrianto", position: "Office Support Staff" },
  { employee_code: "20261104007", name: "Reyhan Afril Julianto", position: "Office Support Staff" },
  { employee_code: "20220203001", name: "Rama Regawa S. A., S.T.", position: "Chief Safety Inspector" },
  { employee_code: "20240903002", name: "Fauzan Akmaluddin, S.T.", position: "Safety Technical Inspector" },
  { employee_code: "20220503003", name: "Imam Rahman R. H., S.Pd.", position: "Safety Technical Inspector" },
  { employee_code: "20250103001", name: "Fakhziar Wildan H., S.T.", position: "Safety Technical Inspector" },
  { employee_code: "20261003001", name: "Demas Cahyadi N., S.T.", position: "Inspector Assistant" },
  { employee_code: "20250701001", name: "Habsi Gufira P., S.AP.", position: "Director" },
  { employee_code: "20251105001", name: "Zulfan Rafly Baihaqi, S.Hum.", position: "IT & Digital Specialist" },
];

export const SEED_CATEGORIES: SeedCategory[] = [
  { code: "ATK", name: "Alat Tulis Kantor", kind: "CONSUMABLE" },
  { code: "KBR", name: "Alat Kebersihan", kind: "CONSUMABLE" },
  { code: "KNS", name: "Konsumsi Kantor", kind: "CONSUMABLE" },
  { code: "BHN", name: "Bahan Pengujian & NDT", kind: "CONSUMABLE" },
  { code: "APD", name: "Alat Pelindung Diri", kind: "PPE" },
  { code: "ALT", name: "Peralatan & Alat Ukur K3", kind: "INSTRUMENT" },
  { code: "BYA", name: "Biaya Operasional Rutin", kind: "SERVICE" },
];

export const SEED_UNITS = [
  "Pcs",
  "Rim",
  "Lembar",
  "Box",
  "Dus",
  "Pack",
  "Botol",
  "Kaleng",
  "Liter",
  "ml",
  "CM",
  "Meter",
  "Roll",
  "Set",
  "Unit",
  "Bulan",
  "Tabung",
  "Galon",
  "Kg",
];

export const SEED_LOCATIONS = [
  { name: "Lemari ATK Kantor", qr_code: "LOC-ATK-01" },
  { name: "Rak Kebersihan", qr_code: "LOC-KBR-01" },
  { name: "Dapur / Pantry", qr_code: "LOC-PAN-01" },
  { name: "Lemari K3 / Ruang Alat", qr_code: "LOC-K3-01" },
  { name: "Gudang Utama", qr_code: "LOC-GDG-01" },
];

export const SEED_PROJECTS = [
  { name: "Operasional Internal Kantor", client: "PT Aksara Riksa Perdana" },
  { name: "Riksa Uji K3 PT TML", client: "PT TML" },
];

export const SEED_ITEMS: SeedItem[] = [
  // ================= ALAT TULIS KANTOR (ATK) =================
  { code: "ATK-001", legacy_code: "1.1", name: "Cover Map Laporan Aksara", category_code: "ATK", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 10, target_stock: 50, abc_class: "B" },
  { code: "ATK-002", legacy_code: "1.2", name: "Amplop Coklat Besar", category_code: "ATK", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 20, target_stock: 100, abc_class: "C" },
  { code: "ATK-003", legacy_code: "1.3", name: "Amplop Coklat Sedang", category_code: "ATK", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 10, target_stock: 50, abc_class: "C" },
  { code: "ATK-004", legacy_code: "1.4", name: "Amplop Coklat Kecil", category_code: "ATK", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 20, target_stock: 100, abc_class: "C" },
  { code: "ATK-005", legacy_code: "1.5", name: "Kertas Hvs F4 Paper One 80 gsm", category_code: "ATK", kind: "CONSUMABLE", unit_name: "Rim", min_stock: 3, target_stock: 10, abc_class: "A" },
  { code: "ATK-006", legacy_code: "1.6", name: "Kertas Hvs A4 Paper One 75 gsm", category_code: "ATK", kind: "CONSUMABLE", unit_name: "Rim", min_stock: 3, target_stock: 10, abc_class: "A" },
  { code: "ATK-007", legacy_code: "1.7", name: "Kertas Concord Hvs F4", category_code: "ATK", kind: "CONSUMABLE", unit_name: "Rim", min_stock: 1, target_stock: 3, abc_class: "B" },
  { code: "ATK-008", legacy_code: "1.8", name: "Kertas Concord Hvs A4", category_code: "ATK", kind: "CONSUMABLE", unit_name: "Rim", min_stock: 1, target_stock: 3, abc_class: "B" },
  { code: "ATK-009", legacy_code: "1.9", name: "Isi Boldliner Biru", category_code: "ATK", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 5, target_stock: 20, abc_class: "C" },
  { code: "ATK-010", legacy_code: "1.10", name: "Ballpoint Bold liner Biru", category_code: "ATK", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 5, target_stock: 24, abc_class: "B" },
  { code: "ATK-011", legacy_code: "1.11", name: "Ballpoint Hitam", category_code: "ATK", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 10, target_stock: 36, abc_class: "B" },
  { code: "ATK-012", legacy_code: "1.12", name: "Pensil 2B", category_code: "ATK", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 5, target_stock: 15, abc_class: "C" },
  { code: "ATK-013", legacy_code: "1.13", name: "Spidol White Board", category_code: "ATK", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 5, target_stock: 15, abc_class: "B" },
  { code: "ATK-014", legacy_code: "1.14", name: "Spidol Permanent", category_code: "ATK", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 5, target_stock: 20, abc_class: "B" },
  { code: "ATK-015", legacy_code: "1.15", name: "Tipe X", category_code: "ATK", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 3, target_stock: 10, abc_class: "C" },
  { code: "ATK-016", legacy_code: "1.16", name: "Meterai 10000", category_code: "ATK", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 10, target_stock: 50, abc_class: "A" },
  { code: "ATK-017", legacy_code: "1.17", name: "Clip Kertas kecil", category_code: "ATK", kind: "CONSUMABLE", unit_name: "Box", min_stock: 3, target_stock: 10, abc_class: "C" },
  { code: "ATK-018", legacy_code: "1.18", name: "Isi Stapless No.10", category_code: "ATK", kind: "CONSUMABLE", unit_name: "Box", min_stock: 5, target_stock: 20, abc_class: "C" },
  { code: "ATK-019", legacy_code: "1.19", name: "Amplop 110x230 mm", category_code: "ATK", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 20, target_stock: 100, abc_class: "C" },
  { code: "ATK-020", legacy_code: "1.20", name: "Tinta Brother Black", category_code: "ATK", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 1, target_stock: 4, abc_class: "A" },
  { code: "ATK-021", legacy_code: "1.21", name: "Tinta Brother Red", category_code: "ATK", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 1, target_stock: 4, abc_class: "B" },
  { code: "ATK-022", legacy_code: "1.22", name: "Tinta Brother Yellow", category_code: "ATK", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 1, target_stock: 4, abc_class: "B" },
  { code: "ATK-023", legacy_code: "1.23", name: "Tinta Brother Blue", category_code: "ATK", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 1, target_stock: 4, abc_class: "B" },
  { code: "ATK-024", legacy_code: "1.24", name: "Tinta Epson Black", category_code: "ATK", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 1, target_stock: 4, abc_class: "A" },
  { code: "ATK-025", legacy_code: "1.25", name: "Tinta Epson Red", category_code: "ATK", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 1, target_stock: 4, abc_class: "B" },
  { code: "ATK-026", legacy_code: "1.26", name: "Tinta Epson Yellow", category_code: "ATK", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 1, target_stock: 4, abc_class: "B" },
  { code: "ATK-027", legacy_code: "1.27", name: "Tinta Epson Blue", category_code: "ATK", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 1, target_stock: 4, abc_class: "B" },
  { code: "ATK-028", legacy_code: "1.28", name: "Cap Aksara", category_code: "ATK", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 1, target_stock: 3, abc_class: "B" },
  { code: "ATK-029", legacy_code: "1.29", name: "Otner", category_code: "ATK", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 3, target_stock: 10, abc_class: "C" },
  { code: "ATK-030", legacy_code: "1.30", name: "Cutter", category_code: "ATK", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 2, target_stock: 5, abc_class: "C" },
  { code: "ATK-031", legacy_code: "1.31", name: "Isi Cutter", category_code: "ATK", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 3, target_stock: 10, abc_class: "C" },
  { code: "ATK-032", legacy_code: "1.32", name: "Gunting", category_code: "ATK", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 2, target_stock: 5, abc_class: "C" },
  { code: "ATK-033", legacy_code: "1.33", name: "Lem Kertas", category_code: "ATK", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 3, target_stock: 10, abc_class: "C" },
  { code: "ATK-034", legacy_code: "1.34", name: "Penggaris Besi", category_code: "ATK", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 2, target_stock: 5, abc_class: "C" },
  { code: "ATK-035", legacy_code: "1.35", name: "Lakban Bening", category_code: "ATK", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 3, target_stock: 8, abc_class: "C" },
  { code: "ATK-036", legacy_code: "1.36", name: "Kelipan Penjepit Kertas", category_code: "ATK", kind: "CONSUMABLE", unit_name: "Box", min_stock: 3, target_stock: 10, abc_class: "C" },
  { code: "ATK-037", legacy_code: "1.37", name: "Isi Tinta Spidol Non Permanen", category_code: "ATK", kind: "CONSUMABLE", unit_name: "Botol", min_stock: 2, target_stock: 5, abc_class: "C" },
  { code: "ATK-038", legacy_code: "1.38", name: "Cartridge Printer Brother", category_code: "ATK", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 2, target_stock: 6, abc_class: "A" },
  { code: "ATK-039", legacy_code: "1.39", name: "Cartridge Printer Epson", category_code: "ATK", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 2, target_stock: 6, abc_class: "A" },
  { code: "ATK-040", legacy_code: "1.40", name: "Pulpen Biru", category_code: "ATK", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 10, target_stock: 36, abc_class: "B" },
  { code: "ATK-041", legacy_code: "5.15", name: "Map snelhecter", category_code: "ATK", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 10, target_stock: 50, abc_class: "C" },
  { code: "ATK-042", legacy_code: "5.16", name: "Buku Nota Kecil 2 Ply", category_code: "ATK", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 5, target_stock: 20, abc_class: "C" },
  { code: "ATK-043", legacy_code: "5.17", name: "Sticky Note Joyko", category_code: "ATK", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 5, target_stock: 20, abc_class: "C" },
  { code: "ATK-044", legacy_code: "5.22", name: "Spidol Tagging Permanen", category_code: "ATK", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 5, target_stock: 20, abc_class: "B" },
  { code: "ATK-045", legacy_code: "5.23", name: "Spidol Marking", category_code: "ATK", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 5, target_stock: 20, abc_class: "B" },
  { code: "ATK-046", legacy_code: "5.28", name: "Papan Tulis Kaca", category_code: "ATK", kind: "CONSUMABLE", unit_name: "Unit", min_stock: 1, target_stock: 2, abc_class: "C" },

  // ================= BAHAN PENGUJIAN & NDT K3 (BHN) =================
  { code: "BHN-001", legacy_code: "2.1", name: "Cleaner / Remover NDT", category_code: "BHN", kind: "CONSUMABLE", unit_name: "Kaleng", min_stock: 3, target_stock: 12, abc_class: "A", has_expiry: true },
  { code: "BHN-002", legacy_code: "2.2", name: "Red Penetrant NDT", category_code: "BHN", kind: "CONSUMABLE", unit_name: "Kaleng", min_stock: 3, target_stock: 12, abc_class: "A", has_expiry: true },
  { code: "BHN-003", legacy_code: "2.3", name: "Developer NDT", category_code: "BHN", kind: "CONSUMABLE", unit_name: "Kaleng", min_stock: 3, target_stock: 12, abc_class: "A", has_expiry: true },
  { code: "BHN-004", legacy_code: "2.4", name: "Amplas Gurinda Kecil", category_code: "BHN", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 50, target_stock: 200, abc_class: "B" },
  { code: "BHN-005", legacy_code: "2.5", name: "Amplas Kasar Meteran", category_code: "BHN", kind: "CONSUMABLE", unit_name: "CM", min_stock: 100, target_stock: 500, abc_class: "B" },
  { code: "BHN-006", legacy_code: "2.6", name: "Gel Thickness", category_code: "BHN", kind: "CONSUMABLE", unit_name: "Botol", min_stock: 2, target_stock: 6, abc_class: "B" },
  { code: "BHN-007", legacy_code: "2.7", name: "Sarung Tangan Kerja", category_code: "BHN", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 10, target_stock: 40, abc_class: "B" },
  { code: "BHN-008", legacy_code: "2.8", name: "Lap Majun / Kain Pembersih", category_code: "BHN", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 20, target_stock: 80, abc_class: "C" },
  { code: "BHN-009", legacy_code: "2.9", name: "Masker Medis", category_code: "BHN", kind: "CONSUMABLE", unit_name: "Box", min_stock: 2, target_stock: 5, abc_class: "C" },
  { code: "BHN-010", legacy_code: "2.11", name: "Batre Jam A", category_code: "BHN", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 4, target_stock: 12, abc_class: "C" },
  { code: "BHN-011", legacy_code: "2.12", name: "Batre Jam AA", category_code: "BHN", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 8, target_stock: 24, abc_class: "C" },
  { code: "BHN-012", legacy_code: "2.13", name: "Batre Jam AAA", category_code: "BHN", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 8, target_stock: 24, abc_class: "C" },
  { code: "BHN-013", legacy_code: "2.14", name: "Baterai kotak 9 Volt", category_code: "BHN", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 4, target_stock: 12, abc_class: "B" },

  // ================= ALAT PELINDUNG DIRI (APD) =================
  { code: "APD-001", legacy_code: "2.10", name: "Masker Half Filter KN95", category_code: "APD", kind: "PPE", unit_name: "Pcs", min_stock: 4, target_stock: 12, abc_class: "B" },
  { code: "APD-002", legacy_code: "2.31", name: "Body Harness", category_code: "APD", kind: "PPE", unit_name: "Set", min_stock: 2, target_stock: 6, abc_class: "A" },
  { code: "APD-003", legacy_code: "2.32", name: "Helm Ketinggian", category_code: "APD", kind: "PPE", unit_name: "Pcs", min_stock: 2, target_stock: 6, abc_class: "A" },
  { code: "APD-004", legacy_code: "2.33", name: "Helm Safety Putih", category_code: "APD", kind: "PPE", unit_name: "Pcs", min_stock: 3, target_stock: 10, abc_class: "B" },
  { code: "APD-005", legacy_code: "2.34", name: "Helm Safety Kuning", category_code: "APD", kind: "PPE", unit_name: "Pcs", min_stock: 3, target_stock: 10, abc_class: "B" },
  { code: "APD-006", legacy_code: "2.35", name: "Rompi Hijau K3", category_code: "APD", kind: "PPE", unit_name: "Pcs", min_stock: 5, target_stock: 15, abc_class: "B" },
  { code: "APD-007", legacy_code: "5.18", name: "Work Positioning Lanyard", category_code: "APD", kind: "PPE", unit_name: "Set", min_stock: 2, target_stock: 6, abc_class: "A" },
  { code: "APD-008", legacy_code: "5.19", name: "Carabiner Cap 25KN", category_code: "APD", kind: "PPE", unit_name: "Pcs", min_stock: 4, target_stock: 12, abc_class: "B" },

  // ================= ALAT UKUR & PERALATAN TEKNIS (ALT) =================
  { code: "ALT-001", legacy_code: "2.15", name: "Sound level Meter", category_code: "ALT", kind: "INSTRUMENT", unit_name: "Unit", min_stock: 1, target_stock: 2, abc_class: "A" },
  { code: "ALT-002", legacy_code: "2.16", name: "Digital Earth Tester Kyoritsu", category_code: "ALT", kind: "INSTRUMENT", unit_name: "Unit", min_stock: 1, target_stock: 2, abc_class: "A" },
  { code: "ALT-003", legacy_code: "2.17", name: "Ultrasonic Thickness Gauge (Tiknes)", category_code: "ALT", kind: "INSTRUMENT", unit_name: "Unit", min_stock: 1, target_stock: 2, abc_class: "A" },
  { code: "ALT-004", legacy_code: "2.18", name: "Sigmat Analog", category_code: "ALT", kind: "INSTRUMENT", unit_name: "Unit", min_stock: 1, target_stock: 3, abc_class: "B" },
  { code: "ALT-005", legacy_code: "2.19", name: "Sigmat Digital", category_code: "ALT", kind: "INSTRUMENT", unit_name: "Unit", min_stock: 1, target_stock: 2, abc_class: "A" },
  { code: "ALT-006", legacy_code: "2.20", name: "Meteran Manual", category_code: "ALT", kind: "INSTRUMENT", unit_name: "Unit", min_stock: 1, target_stock: 3, abc_class: "C" },
  { code: "ALT-007", legacy_code: "2.21", name: "Meteran Digital", category_code: "ALT", kind: "INSTRUMENT", unit_name: "Unit", min_stock: 1, target_stock: 3, abc_class: "B" },
  { code: "ALT-008", legacy_code: "2.22", name: "Cardles Grinder Mini", category_code: "ALT", kind: "INSTRUMENT", unit_name: "Unit", min_stock: 1, target_stock: 3, abc_class: "B" },
  { code: "ALT-009", legacy_code: "2.23", name: "Tang Ampere Krisbow", category_code: "ALT", kind: "INSTRUMENT", unit_name: "Unit", min_stock: 1, target_stock: 2, abc_class: "A" },
  { code: "ALT-010", legacy_code: "2.24", name: "Tacho Meter Krissbow", category_code: "ALT", kind: "INSTRUMENT", unit_name: "Unit", min_stock: 1, target_stock: 2, abc_class: "A" },
  { code: "ALT-011", legacy_code: "2.25", name: "Claim Earth Tester ETCR", category_code: "ALT", kind: "INSTRUMENT", unit_name: "Unit", min_stock: 1, target_stock: 2, abc_class: "A" },
  { code: "ALT-012", legacy_code: "2.26", name: "Earth Map", category_code: "ALT", kind: "INSTRUMENT", unit_name: "Unit", min_stock: 1, target_stock: 3, abc_class: "B" },
  { code: "ALT-013", legacy_code: "2.27", name: "Hydrajaws", category_code: "ALT", kind: "INSTRUMENT", unit_name: "Unit", min_stock: 1, target_stock: 2, abc_class: "A" },
  { code: "ALT-014", legacy_code: "2.28", name: "Handle Thermal Camera", category_code: "ALT", kind: "INSTRUMENT", unit_name: "Unit", min_stock: 1, target_stock: 2, abc_class: "A" },
  { code: "ALT-015", legacy_code: "2.29", name: "Charger Batery", category_code: "ALT", kind: "INSTRUMENT", unit_name: "Unit", min_stock: 1, target_stock: 3, abc_class: "B" },
  { code: "ALT-016", legacy_code: "2.30", name: "HT", category_code: "ALT", kind: "INSTRUMENT", unit_name: "Unit", min_stock: 2, target_stock: 5, abc_class: "B" },
  { code: "ALT-017", legacy_code: "2.36", name: "Meteran Keong", category_code: "ALT", kind: "INSTRUMENT", unit_name: "Unit", min_stock: 1, target_stock: 2, abc_class: "C" },
  { code: "ALT-018", legacy_code: "2.37", name: "Traffic Cone", category_code: "ALT", kind: "INSTRUMENT", unit_name: "Pcs", min_stock: 2, target_stock: 4, abc_class: "C" },
  { code: "ALT-019", legacy_code: "2.38", name: "Head Lamp", category_code: "ALT", kind: "INSTRUMENT", unit_name: "Pcs", min_stock: 2, target_stock: 6, abc_class: "B" },
  { code: "ALT-020", legacy_code: "5.20", name: "Keyboard dan Mouse", category_code: "ALT", kind: "INSTRUMENT", unit_name: "Set", min_stock: 1, target_stock: 2, abc_class: "C" },
  { code: "ALT-021", legacy_code: "5.21", name: "Kabel Ethernet Lan", category_code: "ALT", kind: "INSTRUMENT", unit_name: "Pcs", min_stock: 1, target_stock: 3, abc_class: "C" },
  { code: "ALT-022", legacy_code: "5.29", name: "Mesin Penghancur Kertas", category_code: "ALT", kind: "INSTRUMENT", unit_name: "Unit", min_stock: 1, target_stock: 1, abc_class: "B" },

  // ================= KONSUMSI KANTOR (KNS) =================
  { code: "KNS-001", legacy_code: "3.1", name: "Galon Air Minum", category_code: "KNS", kind: "CONSUMABLE", unit_name: "Galon", min_stock: 2, target_stock: 6, abc_class: "A" },
  { code: "KNS-002", legacy_code: "3.2", name: "Refill Gas Elpiji", category_code: "KNS", kind: "CONSUMABLE", unit_name: "Tabung", min_stock: 1, target_stock: 2, abc_class: "B" },
  { code: "KNS-003", legacy_code: "3.3", name: "Siera 220 Ml", category_code: "KNS", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 24, target_stock: 72, abc_class: "B" },
  { code: "KNS-004", legacy_code: "3.4", name: "Kopi", category_code: "KNS", kind: "CONSUMABLE", unit_name: "Box", min_stock: 2, target_stock: 6, abc_class: "B" },
  { code: "KNS-005", legacy_code: "3.5", name: "Teh", category_code: "KNS", kind: "CONSUMABLE", unit_name: "Box", min_stock: 2, target_stock: 6, abc_class: "B" },
  { code: "KNS-006", legacy_code: "3.6", name: "Gula", category_code: "KNS", kind: "CONSUMABLE", unit_name: "Kg", min_stock: 2, target_stock: 5, abc_class: "B" },
  { code: "KNS-007", legacy_code: "3.7", name: "Minyak", category_code: "KNS", kind: "CONSUMABLE", unit_name: "Liter", min_stock: 1, target_stock: 3, abc_class: "C" },

  // ================= ALAT KEBERSIHAN (KBR) =================
  { code: "KBR-001", legacy_code: "4.1", name: "Clink 5 Liter", category_code: "KBR", kind: "CONSUMABLE", unit_name: "ml", min_stock: 1000, target_stock: 5000, abc_class: "B" },
  { code: "KBR-002", legacy_code: "4.2", name: "Harfix", category_code: "KBR", kind: "CONSUMABLE", unit_name: "Botol", min_stock: 1, target_stock: 3, abc_class: "B" },
  { code: "KBR-003", legacy_code: "4.3", name: "Kamper", category_code: "KBR", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 5, target_stock: 20, abc_class: "C" },
  { code: "KBR-004", legacy_code: "4.4", name: "Pewangi Ruangan", category_code: "KBR", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 2, target_stock: 6, abc_class: "B" },
  { code: "KBR-005", legacy_code: "4.5", name: "Soklin Lantai 5 Liter", category_code: "KBR", kind: "CONSUMABLE", unit_name: "ml", min_stock: 1000, target_stock: 5000, abc_class: "B" },
  { code: "KBR-006", legacy_code: "4.6", name: "Wipol 2 Liter", category_code: "KBR", kind: "CONSUMABLE", unit_name: "Botol", min_stock: 1, target_stock: 3, abc_class: "B" },
  { code: "KBR-007", legacy_code: "4.7", name: "Hit 750 ml", category_code: "KBR", kind: "CONSUMABLE", unit_name: "Botol", min_stock: 1, target_stock: 3, abc_class: "B" },
  { code: "KBR-008", legacy_code: "4.8", name: "Sunlight", category_code: "KBR", kind: "CONSUMABLE", unit_name: "ml", min_stock: 400, target_stock: 1500, abc_class: "B" },
  { code: "KBR-009", legacy_code: "4.9", name: "Sabun Cuci Tangan 1 Liter", category_code: "KBR", kind: "CONSUMABLE", unit_name: "ml", min_stock: 500, target_stock: 2000, abc_class: "B" },
  { code: "KBR-010", legacy_code: "4.10", name: "Tissue", category_code: "KBR", kind: "CONSUMABLE", unit_name: "Pack", min_stock: 5, target_stock: 20, abc_class: "B" },
  { code: "KBR-011", legacy_code: "4.11", name: "Trashbag", category_code: "KBR", kind: "CONSUMABLE", unit_name: "Pack", min_stock: 5, target_stock: 20, abc_class: "B" },
  { code: "KBR-012", legacy_code: "4.12", name: "Spons Cuci Piring", category_code: "KBR", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 5, target_stock: 15, abc_class: "C" },
  { code: "KBR-013", legacy_code: "4.13", name: "Sapu", category_code: "KBR", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 1, target_stock: 3, abc_class: "C" },
  { code: "KBR-014", legacy_code: "4.14", name: "Pengki", category_code: "KBR", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 1, target_stock: 3, abc_class: "C" },
  { code: "KBR-015", legacy_code: "4.15", name: "Kemoceng", category_code: "KBR", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 1, target_stock: 2, abc_class: "C" },
  { code: "KBR-016", legacy_code: "4.16", name: "Kanebo", category_code: "KBR", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 2, target_stock: 5, abc_class: "C" },
  { code: "KBR-017", legacy_code: "4.17", name: "Sikat", category_code: "KBR", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 1, target_stock: 3, abc_class: "C" },
  { code: "KBR-018", legacy_code: "4.18", name: "Alat Pel", category_code: "KBR", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 1, target_stock: 3, abc_class: "C" },
  { code: "KBR-019", legacy_code: "4.19", name: "Sikat Wc", category_code: "KBR", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 1, target_stock: 3, abc_class: "C" },
  { code: "KBR-020", legacy_code: "4.20", name: "Lap Micro Fiber", category_code: "KBR", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 3, target_stock: 10, abc_class: "C" },
  { code: "KBR-021", legacy_code: "4.21", name: "Napocilin", category_code: "KBR", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 2, target_stock: 6, abc_class: "C" },
  { code: "KBR-022", legacy_code: "4.22", name: "Keset", category_code: "KBR", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 2, target_stock: 6, abc_class: "C" },
  { code: "KBR-023", legacy_code: "4.23", name: "Asbak", category_code: "KBR", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 2, target_stock: 5, abc_class: "C" },
  { code: "KBR-024", legacy_code: "4.24", name: "Sabun Cuci Mobil", category_code: "KBR", kind: "CONSUMABLE", unit_name: "ml", min_stock: 500, target_stock: 2000, abc_class: "C" },
  { code: "KBR-025", legacy_code: "4.25", name: "Semir Ban", category_code: "KBR", kind: "CONSUMABLE", unit_name: "ml", min_stock: 500, target_stock: 2000, abc_class: "C" },
  { code: "KBR-026", legacy_code: "4.26", name: "Sapu Lidi", category_code: "KBR", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 1, target_stock: 3, abc_class: "C" },
  { code: "KBR-027", legacy_code: "4.27", name: "Slot Pintu Kaca Kamar Mandi", category_code: "KBR", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 1, target_stock: 2, abc_class: "C" },
  { code: "KBR-028", legacy_code: "4.28", name: "Kipas Cosmos", category_code: "KBR", kind: "CONSUMABLE", unit_name: "Unit", min_stock: 1, target_stock: 2, abc_class: "C" },
  { code: "KBR-029", legacy_code: "4.29", name: "Rak Sepatu", category_code: "KBR", kind: "CONSUMABLE", unit_name: "Unit", min_stock: 1, target_stock: 2, abc_class: "C" },
  { code: "KBR-030", legacy_code: "5.10", name: "Tempat Tissue Toilet", category_code: "KBR", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 1, target_stock: 3, abc_class: "C" },
  { code: "KBR-031", legacy_code: "5.12", name: "Lampu", category_code: "KBR", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 3, target_stock: 10, abc_class: "C" },
  { code: "KBR-032", legacy_code: "5.26", name: "Terminal Listrik", category_code: "KBR", kind: "CONSUMABLE", unit_name: "Pcs", min_stock: 2, target_stock: 5, abc_class: "C" },
];

export const SEED_CONVERSIONS: SeedUnitConversion[] = [
  // 1 Rim Kertas = 500 Lembar
  { item_code: "ATK-005", from_unit: "Rim", to_unit: "Lembar", factor: 500 },
  { item_code: "ATK-006", from_unit: "Rim", to_unit: "Lembar", factor: 500 },
  { item_code: "ATK-007", from_unit: "Rim", to_unit: "Lembar", factor: 500 },
  { item_code: "ATK-008", from_unit: "Rim", to_unit: "Lembar", factor: 500 },
  // 1 Dus / Pack Siera = 24 Pcs
  { item_code: "KNS-003", from_unit: "Pack", to_unit: "Pcs", factor: 24 },
  { item_code: "KNS-003", from_unit: "Dus", to_unit: "Pcs", factor: 24 },
  // 1 Liter Clink = 1000 ml
  { item_code: "KBR-001", from_unit: "Liter", to_unit: "ml", factor: 1000 },
  // 1 Liter Soklin = 1000 ml
  { item_code: "KBR-005", from_unit: "Liter", to_unit: "ml", factor: 1000 },
];
