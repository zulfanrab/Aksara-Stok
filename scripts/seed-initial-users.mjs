import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

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

const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = envConfig.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

async function main() {
  console.log("Membuat akun profil awal sesuai Blueprint Bagian 15...");

  // Ambil data person_id
  const { data: people } = await supabase.from("people").select("id, employee_code, name");
  const peopleMap = Object.fromEntries(people.map((p) => [p.employee_code, p.id]));

  const usersToCreate = [
    {
      email: "ajay@aksarariksa.co.id",
      password: "AksaraStok2026!",
      full_name: "M. Fazar Maulana (Ajay)",
      role: "ADMIN",
      person_id: peopleMap["20220905001"],
    },
    {
      email: "marsya@aksarariksa.co.id",
      password: "AksaraStok2026!",
      full_name: "Marsya Aulia R., S.Kep.",
      role: "ADMIN",
      person_id: peopleMap["20261004006"],
    },
    {
      email: "habsi@aksarariksa.co.id",
      password: "AksaraStok2026!",
      full_name: "Habsi Gufira P., S.AP.",
      role: "MANAJER",
      person_id: peopleMap["20250701001"],
    },
  ];

  for (const u of usersToCreate) {
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { full_name: u.full_name },
    });

    if (userError) {
      console.warn(`Akun ${u.email} mungkin sudah ada atau error:`, userError.message);
    } else if (userData?.user) {
      console.log(`✅ Berhasil membuat auth user: ${u.email} (${userData.user.id})`);
      // Simpan ke profiles
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: userData.user.id,
        full_name: u.full_name,
        role: u.role,
        person_id: u.person_id || null,
      });
      if (profileError) console.error(`   ❌ Gagal buat profil:`, profileError.message);
      else console.log(`   ✅ Profil tersimpan untuk ${u.full_name}`);
    }
  }

  // Tampilkan semua profil
  const { data: profiles } = await supabase.from("profiles").select("id, full_name, role, person_id");
  console.log("Daftar profil aktif saat ini:", profiles);
}

main().catch(console.error);
