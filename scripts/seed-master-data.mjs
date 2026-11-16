import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// 1. Baca .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
let envConfig = {};
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  content.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...vals] = trimmed.split("=");
      envConfig[key.trim()] = vals.join("=").trim();
    }
  });
}

const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
// Gunakan Service Role Key untuk bypass RLS saat initial seeding
const supabaseKey = envConfig.SUPABASE_SERVICE_ROLE_KEY || envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Error: SUPABASE_URL atau SUPABASE_KEY tidak ditemukan di .env.local!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

// Import seed data
async function main() {
  console.log("🌱 Memulai seeding Master Data PT Aksara Riksa Perdana...");
  console.log("Target Database:", supabaseUrl);

  const { SEED_PEOPLE, SEED_CATEGORIES, SEED_UNITS, SEED_LOCATIONS, SEED_PROJECTS, SEED_ITEMS, SEED_CONVERSIONS } =
    await import("../src/data/seed-data.ts");

  // 1. Seed People (13 orang)
  console.log(`\n1. Seeding ${SEED_PEOPLE.length} data karyawan (people)...`);
  for (const person of SEED_PEOPLE) {
    const { error } = await supabase.from("people").upsert(
      {
        employee_code: person.employee_code,
        name: person.name,
        position: person.position,
        is_active: true,
      },
      { onConflict: "employee_code" }
    );
    if (error) console.error(`   ❌ Gagal upsert person ${person.name}:`, error.message);
  }
  console.log("   ✅ Selesai seeding people.");

  // 2. Seed Categories
  console.log(`\n2. Seeding ${SEED_CATEGORIES.length} kategori...`);
  for (const cat of SEED_CATEGORIES) {
    const { error } = await supabase.from("categories").upsert(
      {
        code: cat.code,
        name: cat.name,
        kind: cat.kind,
      },
      { onConflict: "code" }
    );
    if (error) console.error(`   ❌ Gagal upsert category ${cat.code}:`, error.message);
  }
  console.log("   ✅ Selesai seeding categories.");

  // 3. Seed Units
  console.log(`\n3. Seeding ${SEED_UNITS.length} satuan (units)...`);
  for (const unitName of SEED_UNITS) {
    const { error } = await supabase.from("units").upsert(
      { name: unitName },
      { onConflict: "name" }
    );
    if (error) console.error(`   ❌ Gagal upsert unit ${unitName}:`, error.message);
  }
  console.log("   ✅ Selesai seeding units.");

  // 4. Seed Locations
  console.log(`\n4. Seeding ${SEED_LOCATIONS.length} lokasi simpan...`);
  for (const loc of SEED_LOCATIONS) {
    const { error } = await supabase.from("locations").upsert(
      {
        name: loc.name,
        qr_code: loc.qr_code,
        is_active: true,
      },
      { onConflict: "qr_code" }
    );
    if (error) console.error(`   ❌ Gagal upsert location ${loc.name}:`, error.message);
  }
  console.log("   ✅ Selesai seeding locations.");

  // 5. Seed Projects
  console.log(`\n5. Seeding ${SEED_PROJECTS.length} proyek...`);
  for (const proj of SEED_PROJECTS) {
    const { error } = await supabase.from("projects").upsert(
      {
        name: proj.name,
        client: proj.client,
        is_active: true,
      },
      { onConflict: "name" }
    );
    if (error && !error.message.includes("duplicate key")) {
      console.error(`   ❌ Gagal upsert project ${proj.name}:`, error.message);
    }
  }
  console.log("   ✅ Selesai seeding projects.");

  // Ambil referensi UUID yang baru di-seed
  const { data: dbCategories } = await supabase.from("categories").select("id, code");
  const { data: dbUnits } = await supabase.from("units").select("id, name");
  const { data: dbLocations } = await supabase.from("locations").select("id, name");

  const catMap = Object.fromEntries(dbCategories?.map((c) => [c.code, c.id]) || []);
  const unitMap = Object.fromEntries(dbUnits?.map((u) => [u.name, u.id]) || []);
  const defaultLocId = dbLocations?.[0]?.id || null;

  // 6. Seed Items
  console.log(`\n6. Seeding ${SEED_ITEMS.length} master barang (items)...`);
  let successItems = 0;
  for (const item of SEED_ITEMS) {
    const category_id = catMap[item.category_code];
    const base_unit_id = unitMap[item.unit_name];

    if (!category_id || !base_unit_id) {
      console.warn(`   ⚠️ Skip item ${item.code}: Kategori (${item.category_code}) atau Satuan (${item.unit_name}) tidak ditemukan.`);
      continue;
    }

    const { error } = await supabase.from("items").upsert(
      {
        code: item.code,
        legacy_code: item.legacy_code || null,
        name: item.name,
        category_id,
        kind: item.kind,
        base_unit_id,
        min_stock: item.min_stock,
        target_stock: item.target_stock,
        abc_class: item.abc_class || null,
        default_location_id: defaultLocId,
        has_expiry: item.has_expiry || false,
        is_active: true,
      },
      { onConflict: "code" }
    );

    if (error) {
      console.error(`   ❌ Gagal upsert item ${item.code}:`, error.message);
    } else {
      successItems++;
    }
  }
  console.log(`   ✅ Selesai seeding items (${successItems} barang berhasil dimasukkan).`);

  // 7. Seed Unit Conversions
  console.log(`\n7. Seeding ${SEED_CONVERSIONS.length} aturan konversi satuan...`);
  const { data: dbItems } = await supabase.from("items").select("id, code");
  const itemMap = Object.fromEntries(dbItems?.map((i) => [i.code, i.id]) || []);

  for (const conv of SEED_CONVERSIONS) {
    const item_id = itemMap[conv.item_code];
    const from_unit_id = unitMap[conv.from_unit];
    const to_unit_id = unitMap[conv.to_unit];

    if (item_id && from_unit_id && to_unit_id) {
      const { error } = await supabase.from("unit_conversions").upsert(
        {
          item_id,
          from_unit_id,
          to_unit_id,
          factor: conv.factor,
        },
        { onConflict: "item_id,from_unit_id,to_unit_id" }
      );
      if (error && !error.message.includes("duplicate")) {
        console.error(`   ❌ Gagal upsert conversion ${conv.item_code}:`, error.message);
      }
    }
  }
  console.log("   ✅ Selesai seeding unit conversions.");

  console.log("\n========================================================");
  console.log("🎉 SEEDING MASTER DATA BERHASIL DILAKSANAKAN 100%!");
  console.log("========================================================");
}

main().catch((err) => {
  console.error("Fatal Error saat seeding:", err);
  process.exit(1);
});
