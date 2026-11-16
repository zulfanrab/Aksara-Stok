import { describe, it, expect } from "vitest";
import {
  calculateCurrentStock,
  evaluateStockStatus,
  convertUnit,
  calculateStockTakeDiscrepancy,
  validateApproverIsNotCounter,
  type StockMovementRecord,
} from "../index";

describe("Logika Ledger Stok (Append-Only)", () => {
  it("menghitung saldo awal dari transaksi IN, OUT, ADJUST, dan REVERSAL secara akurat", () => {
    const movements: StockMovementRecord[] = [
      {
        id: "11111111-1111-4111-8111-111111111111",
        item_id: "item-atk-001",
        type: "IN",
        qty: 50,
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        item_id: "item-atk-001",
        type: "OUT",
        qty: 15,
      },
      {
        id: "33333333-3333-4333-8333-333333333333",
        item_id: "item-atk-001",
        type: "ADJUST",
        qty: -2, // Penyesuaian fisik berkurang 2
      },
      {
        id: "44444444-4444-4444-8444-444444444444",
        item_id: "item-atk-001",
        type: "REVERSAL",
        qty: 3, // Pembalik dari transaksi salah catat
      },
    ];

    // 50 - 15 - 2 - 3 = 30
    const stock = calculateCurrentStock(movements);
    expect(stock).toBe(30);
  });

  it("menangani angka desimal seperti pada tinta printer (0.5 pcs) dan cairan (1800 ml)", () => {
    const movements: StockMovementRecord[] = [
      {
        id: "mov-01",
        item_id: "tinta-epson",
        type: "IN",
        qty: 1.0,
      },
      {
        id: "mov-02",
        item_id: "tinta-epson",
        type: "OUT",
        qty: 0.5,
      },
    ];

    expect(calculateCurrentStock(movements)).toBe(0.5);
  });

  it("mengembalikan 0 untuk item tanpa riwayat pergerakan", () => {
    expect(calculateCurrentStock([])).toBe(0);
  });

  it("mengevaluasi status stok (HABIS, MENIPIS, AMAN) sesuai batas minimum", () => {
    const minStock = 5;

    expect(evaluateStockStatus(0, minStock)).toBe("HABIS");
    expect(evaluateStockStatus(-1, minStock)).toBe("HABIS");
    expect(evaluateStockStatus(3, minStock)).toBe("MENIPIS");
    expect(evaluateStockStatus(5, minStock)).toBe("MENIPIS");
    expect(evaluateStockStatus(6, minStock)).toBe("AMAN");
  });
});

describe("Konversi Satuan (Unit Conversion)", () => {
  it("mengonversi satuan kemasan ke satuan dasar (Rim ke Lembar)", () => {
    // 1 Rim = 500 Lembar
    const rim = 3;
    const factor = 500;
    const lembar = convertUnit(rim, factor, "toBase");
    expect(lembar).toBe(1500);
  });

  it("mengonversi satuan dasar ke satuan kemasan (Lembar ke Rim)", () => {
    const lembar = 2500;
    const factor = 500;
    const rim = convertUnit(lembar, factor, "fromBase");
    expect(rim).toBe(5);
  });

  it("mengonversi Pack Siera ke Pcs (1 Pack = 24 Pcs)", () => {
    const pack = 3;
    const factor = 24;
    expect(convertUnit(pack, factor, "toBase")).toBe(72);
  });

  it("mengonversi Liter ke mililiter (1 Liter = 1000 ml)", () => {
    expect(convertUnit(1.5, 1000, "toBase")).toBe(1500);
    expect(convertUnit(1800, 1000, "fromBase")).toBe(1.8);
  });

  it("melempar error jika faktor konversi <= 0", () => {
    expect(() => convertUnit(10, 0, "toBase")).toThrow();
    expect(() => convertUnit(10, -5, "toBase")).toThrow();
  });
});

describe("Perhitungan Selisih & Toleransi Stock Opname", () => {
  it("lolos toleransi bila tidak ada selisih (0 discrepancy)", () => {
    const result = calculateStockTakeDiscrepancy({
      item_id: "item-1",
      system_qty: 100,
      counted_qty: 100,
      unit_price: 5000,
    });

    expect(result.discrepancy_qty).toBe(0);
    expect(result.discrepancy_value).toBe(0);
    expect(result.is_within_tolerance).toBe(true);
    expect(result.requires_recount).toBe(false);
    expect(result.requires_photo).toBe(false);
    expect(result.requires_explanation).toBe(false);
  });

  it("lolos toleransi untuk barang biasa jika selisih masih dalam ambang 5% atau 1 unit", () => {
    // Selisih 1 unit pada saldo 10 unit (10% tapi batas min 1 unit terpenuhi)
    const result1 = calculateStockTakeDiscrepancy({
      item_id: "item-amplop",
      system_qty: 10,
      counted_qty: 11,
      unit_price: 2000,
    });
    expect(result1.is_within_tolerance).toBe(true);
    expect(result1.requires_recount).toBe(false);
    expect(result1.requires_explanation).toBe(true); // Tetap butuh penjelasan jika ada selisih

    // Selisih 4 unit pada saldo 100 unit (4% <= 5%)
    const result2 = calculateStockTakeDiscrepancy({
      item_id: "item-amplop-besar",
      system_qty: 100,
      counted_qty: 96,
      unit_price: 1500,
    });
    expect(result2.is_within_tolerance).toBe(true);
    expect(result2.requires_recount).toBe(false);
  });

  it("mewajibkan hitung ulang jika selisih melebihi toleransi", () => {
    // Selisih 10 unit pada saldo 100 unit (10% > 5%)
    const result = calculateStockTakeDiscrepancy({
      item_id: "item-kertas",
      system_qty: 100,
      counted_qty: 90,
      unit_price: 50000,
    });

    expect(result.discrepancy_qty).toBe(-10);
    expect(result.is_within_tolerance).toBe(false);
    expect(result.requires_recount).toBe(true);
  });

  it("alat ukur atau barang bernilai tinggi (is_high_value) memiliki toleransi ketat 0", () => {
    const result = calculateStockTakeDiscrepancy({
      item_id: "item-sound-level-meter",
      system_qty: 2,
      counted_qty: 1,
      unit_price: 1500000,
      is_high_value: true,
    });

    expect(result.is_within_tolerance).toBe(false);
    expect(result.requires_recount).toBe(true);
    expect(result.requires_photo).toBe(true); // Karena nilai selisih Rp1.500.000 >= Rp100.000
  });

  it("mewajibkan foto bukti jika total nilai selisih >= Rp100.000", () => {
    const result = calculateStockTakeDiscrepancy({
      item_id: "item-tinta",
      system_qty: 10,
      counted_qty: 8, // Selisih -2 unit
      unit_price: 80000, // Total nilai = 160.000
    });

    expect(result.discrepancy_value).toBe(-160000);
    expect(result.requires_photo).toBe(true);
  });

  it("menggunakan recount_qty saat tersedia untuk menggantikan counted_qty", () => {
    const result = calculateStockTakeDiscrepancy({
      item_id: "item-box",
      system_qty: 10,
      counted_qty: 5, // Awalnya salah hitung 5
      recount_qty: 10, // Dihitung ulang oleh orang kedua = 10
      unit_price: 10000,
    });

    expect(result.effective_counted_qty).toBe(10);
    expect(result.discrepancy_qty).toBe(0);
    expect(result.is_within_tolerance).toBe(true);
  });
});

describe("Pemisahan Tugas: Penghitung Dilarang Menyetujui Hitungannya Sendiri", () => {
  const approverProfileId = "user-habsi-director-uuid";
  const approverPersonId = "person-habsi-uuid";

  it("menolak persetujuan jika approver tercatat sebagai counted_by di salah satu baris", () => {
    const lines = [
      { counted_by: "user-ajay-uuid", counted_by_person_id: "person-ajay-uuid" },
      { counted_by: approverProfileId, counted_by_person_id: approverPersonId }, // Konflik!
    ];

    const validation = validateApproverIsNotCounter(
      approverProfileId,
      approverPersonId,
      lines
    );

    expect(validation.valid).toBe(false);
    expect(validation.conflictCount).toBe(1);
    expect(validation.message).toContain("Penghitung tidak boleh menyetujui");
  });

  it("menolak persetujuan jika approver tercatat melalui person_id yang sama", () => {
    const lines = [
      { counted_by: null, counted_by_person_id: approverPersonId }, // Konflik person!
    ];

    const validation = validateApproverIsNotCounter(
      approverProfileId,
      approverPersonId,
      lines
    );

    expect(validation.valid).toBe(false);
    expect(validation.conflictCount).toBe(1);
  });

  it("meloloskan persetujuan jika approver bukan pencatat pada baris manapun", () => {
    const lines = [
      { counted_by: "user-marsya-uuid", counted_by_person_id: "person-marsya-uuid" },
      { counted_by: "user-ajay-uuid", counted_by_person_id: "person-ajay-uuid" },
    ];

    const validation = validateApproverIsNotCounter(
      approverProfileId,
      approverPersonId,
      lines
    );

    expect(validation.valid).toBe(true);
    expect(validation.conflictCount).toBe(0);
  });
});

describe("Siklus Catat Keluar, Catat Masuk, dan Pembalik (REVERSAL)", () => {
  it("pencatatan OUT mengurangi saldo persediaan", () => {
    const movements: StockMovementRecord[] = [
      { id: "mov-in-1", item_id: "siera", type: "IN", qty: 100 },
      { id: "mov-out-1", item_id: "siera", type: "OUT", qty: 24 },
    ];
    expect(calculateCurrentStock(movements)).toBe(76);
  });

  it("pencatatan IN dengan konversi kemasan (3 Pack @ 24 = 72 Pcs) menambah saldo dengan tepat", () => {
    const qtyBuy = 3;
    const factor = 24;
    const qtyBase = convertUnit(qtyBuy, factor, "toBase");
    expect(qtyBase).toBe(72);

    const movements: StockMovementRecord[] = [
      { id: "mov-in-siera", item_id: "siera", type: "IN", qty: qtyBase },
    ];
    expect(calculateCurrentStock(movements)).toBe(72);
  });

  it("transaksi REVERSAL atas transaksi OUT memulihkan saldo kembali utuh", () => {
    // Awal 50, keluar 10 -> sisa 40. Lalu OUT 10 dibatalkan lewat REVERSAL (qty: -10)
    // Formula: 50 - 10 - (-10) = 50
    const movements: StockMovementRecord[] = [
      { id: "mov-init", item_id: "amplop", type: "IN", qty: 50 },
      { id: "mov-err-out", item_id: "amplop", type: "OUT", qty: 10 },
      { id: "mov-reversal", item_id: "amplop", type: "REVERSAL", qty: -10 },
    ];
    expect(calculateCurrentStock(movements)).toBe(50);
  });

  it("transaksi REVERSAL atas transaksi IN membatalkan penambahan saldo kembali ke awal", () => {
    // Awal 20, salah masuk 30 -> jadi 50. Dibatalkan lewat REVERSAL (qty: 30)
    // Formula: 20 + 30 - 30 = 20
    const movements: StockMovementRecord[] = [
      { id: "mov-init", item_id: "kertas", type: "IN", qty: 20 },
      { id: "mov-err-in", item_id: "kertas", type: "IN", qty: 30 },
      { id: "mov-reversal", item_id: "kertas", type: "REVERSAL", qty: 30 },
    ];
    expect(calculateCurrentStock(movements)).toBe(20);
  });
});

describe("Siklus Posting Penyesuaian Opname (ADJUST Movements)", () => {
  it("membuat mutasi ADJUST positif dan negatif secara presisi sehingga saldo sistem sama dengan fisik", () => {
    // Skenario:
    // Item A: saldo sistem 100, fisik dihitung 95 (kurang 5) -> ADJUST -5
    // Item B: saldo sistem 20, fisik dihitung 23 (lebih 3) -> ADJUST +3
    // Item C: saldo sistem 50, fisik dihitung 50 (cocok) -> tidak butuh ADJUST

    const items = [
      { id: "item-a", system_qty: 100, counted_qty: 95, recount_qty: null },
      { id: "item-b", system_qty: 20, counted_qty: 18, recount_qty: 23 }, // menggunakan recount_qty
      { id: "item-c", system_qty: 50, counted_qty: 50, recount_qty: null },
    ];

    const adjustments = items
      .map((item) => {
        const finalCount = item.recount_qty !== null ? item.recount_qty : item.counted_qty;
        const diff = finalCount - item.system_qty;
        return {
          item_id: item.id,
          diff,
        };
      })
      .filter((adj) => adj.diff !== 0);

    expect(adjustments).toHaveLength(2);
    expect(adjustments[0]).toEqual({ item_id: "item-a", diff: -5 });
    expect(adjustments[1]).toEqual({ item_id: "item-b", diff: 3 });

    // Verifikasi saldo baru setelah ADJUST:
    // Item A: 100 + (-5) = 95 (sesuai fisik)
    const movementsA: StockMovementRecord[] = [
      { id: "mov-a-init", item_id: "item-a", type: "IN", qty: 100 },
      { id: "mov-a-adj", item_id: "item-a", type: "ADJUST", qty: adjustments[0].diff },
    ];
    expect(calculateCurrentStock(movementsA)).toBe(95);

    // Item B: 20 + 3 = 23 (sesuai fisik recount)
    const movementsB: StockMovementRecord[] = [
      { id: "mov-b-init", item_id: "item-b", type: "IN", qty: 20 },
      { id: "mov-b-adj", item_id: "item-b", type: "ADJUST", qty: adjustments[1].diff },
    ];
    expect(calculateCurrentStock(movementsB)).toBe(23);
  });
});

describe("Antrean Outbox Offline & Idempotensi Klien (Langkah 5)", () => {
  interface MockOutboxItem {
    id: string; // UUID v4 dari klien
    actionType: "STOCK_OUT" | "STOCK_IN" | "STOCK_COUNT";
    payload: { itemId?: string; qty?: number; lineId?: string; countedQty?: number };
    createdAt: string;
    status: "PENDING" | "SYNCING" | "FAILED";
  }

  it("menjaga urutan FIFO pada antrean mutasi offline", () => {
    const queue: MockOutboxItem[] = [
      {
        id: "uuid-002",
        actionType: "STOCK_OUT",
        payload: { itemId: "item-1", qty: 2 },
        createdAt: "2026-11-16T10:05:00Z",
        status: "PENDING",
      },
      {
        id: "uuid-001",
        actionType: "STOCK_OUT",
        payload: { itemId: "item-1", qty: 5 },
        createdAt: "2026-11-16T10:00:00Z", // Dibuat lebih dulu
        status: "PENDING",
      },
    ];

    // Urutkan FIFO berdasarkan createdAt ascending
    const sorted = [...queue].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    expect(sorted[0].id).toBe("uuid-001");
    expect(sorted[1].id).toBe("uuid-002");
  });

  it("mencegah duplikasi data saat sinkronisasi berulang berkat UUID v4 idempoten", () => {
    // Simulasi database backend yang sudah menerima transaksi uuid-001
    const databaseLedger = new Set<string>(["uuid-001"]);

    const syncItem = (item: MockOutboxItem): { synced: boolean; reason: string } => {
      if (databaseLedger.has(item.id)) {
        return { synced: false, reason: "Sudah pernah dicatat (idempoten)" };
      }
      databaseLedger.add(item.id);
      return { synced: true, reason: "Sukses dicatat" };
    };

    // Percobaan pertama kirim uuid-001 (sudah ada)
    const result1 = syncItem({
      id: "uuid-001",
      actionType: "STOCK_OUT",
      payload: { itemId: "item-1", qty: 5 },
      createdAt: "2026-11-16T10:00:00Z",
      status: "PENDING",
    });
    expect(result1.synced).toBe(false);
    expect(result1.reason).toContain("idempoten");

    // Percobaan kirim item baru uuid-003
    const result2 = syncItem({
      id: "uuid-003",
      actionType: "STOCK_OUT",
      payload: { itemId: "item-2", qty: 1 },
      createdAt: "2026-11-16T10:10:00Z",
      status: "PENDING",
    });
    expect(result2.synced).toBe(true);
    expect(databaseLedger.has("uuid-003")).toBe(true);
  });

  it("memperbarui saldo stok lokal secara optimistik saat offline", () => {
    const localStockMap: Record<string, number> = {
      "item-kertas": 50,
      "item-tinta": 10,
    };

    // Simulasi pengeluaran offline 15 rim kertas
    const offlineOutQty = 15;
    localStockMap["item-kertas"] = (localStockMap["item-kertas"] || 0) - offlineOutQty;
    expect(localStockMap["item-kertas"]).toBe(35);

    // Simulasi penerimaan offline 5 botol tinta
    const offlineInQty = 5;
    localStockMap["item-tinta"] = (localStockMap["item-tinta"] || 0) + offlineInQty;
    expect(localStockMap["item-tinta"]).toBe(15);
  });
});

describe("Foto Bukti Pengecualian & Kompresi Perangkat (Langkah 6)", () => {
  // Import helper kompresor & storage logic
  it("menghitung skala resolusi gambar dengan batas maksimum 1280 px secara presisi", async () => {
    const { calculateScaledDimensions } = await import("@/lib/storage/compressor");

    // Foto landscape resolusi kamera HP (4000 x 3000)
    const landscape = calculateScaledDimensions(4000, 3000, 1280);
    expect(landscape.width).toBe(1280);
    expect(landscape.height).toBe(960);
    expect(landscape.scaled).toBe(true);

    // Foto portrait resolusi kamera HP (3000 x 4000)
    const portrait = calculateScaledDimensions(3000, 4000, 1280);
    expect(portrait.width).toBe(960);
    expect(portrait.height).toBe(1280);
    expect(portrait.scaled).toBe(true);

    // Foto kecil di bawah 1280 px tidak perlu di-upscale
    const small = calculateScaledDimensions(800, 600, 1280);
    expect(small.width).toBe(800);
    expect(small.height).toBe(600);
    expect(small.scaled).toBe(false);
  });

  it("menghasilkan struktur path foto terorganisir per tahun dan bulan", async () => {
    const { generatePhotoPath } = await import("@/lib/storage");

    const fixedDate = new Date("2026-11-16T10:00:00Z");
    const opnamePath = generatePhotoPath("opname", "line-uuid-12345", fixedDate);
    expect(opnamePath).toBe("opname/2026/11/line-uuid-12345.jpg");

    const receiptPath = generatePhotoPath("receipts", "inv-2026-001", fixedDate);
    expect(receiptPath).toBe("receipts/2026/11/inv-2026-001.jpg");
  });

  it("menilai kewajiban foto bukti sesuai ambang batas Rp 100.000 dan alat ukur K3", async () => {
    const { isPhotoRequiredForLine } = await import("@/lib/storage");

    // ATK / barang biasa dengan selisih kecil (< Rp 100.000) -> TIDAK WAJIB FOTO
    expect(isPhotoRequiredForLine(35000, "CONSUMABLE")).toBe(false);
    expect(isPhotoRequiredForLine(-50000, "CONSUMABLE")).toBe(false);

    // ATK / barang biasa dengan selisih besar (>= Rp 100.000) -> WAJIB FOTO
    expect(isPhotoRequiredForLine(100000, "CONSUMABLE")).toBe(true);
    expect(isPhotoRequiredForLine(-250000, "CONSUMABLE")).toBe(true);

    // Alat ukur K3 (INSTRUMENT) -> SELALU WAJIB FOTO JIKA BERSLEISIH
    expect(isPhotoRequiredForLine(1, "INSTRUMENT")).toBe(true);
    expect(isPhotoRequiredForLine(-1, "INSTRUMENT")).toBe(true);
    expect(isPhotoRequiredForLine(0, "INSTRUMENT")).toBe(false);
  });
});



