-- ==============================================================================
-- PT AKSARA RIKSA PERDANA - SISTEM INVENTARIS & STOCK OPNAME (PWA)
-- Migrasi Awal: Skema Inti, Ledger Append-Only, Penegakan Aturan Bisnis & RLS
-- Mengacu pada BLUEPRINT.md (Revisi Rev.3 Bagian 15)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS
DO $$ BEGIN
  CREATE TYPE item_kind AS ENUM ('CONSUMABLE', 'PPE', 'INSTRUMENT', 'SERVICE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE movement_type AS ENUM ('IN', 'OUT', 'ADJUST', 'REVERSAL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE stock_take_status AS ENUM ('DRAFT', 'COUNTING', 'REVIEW', 'APPROVED', 'POSTED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE asset_status AS ENUM ('AVAILABLE', 'LOANED', 'REPAIR', 'LOST', 'RETIRED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('STAFF', 'AHLI', 'ADMIN', 'MANAJER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. TABEL PENGGUNA BARANG (people - TANPA LOGIN)
-- Sesuai Bagian 15: Daftar orang yang meminjam/memakai barang, tanpa akun login.
CREATE TABLE IF NOT EXISTS people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. TABEL PROFIL PENGGUNA SISTEM (profiles - TERKAIT auth.users)
-- Untuk staf pengelola dan pimpinan yang memiliki akun login aplikasi.
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'STAFF',
  person_id UUID REFERENCES people(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. MASTER DATA
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  kind item_kind NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  qr_code TEXT UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  client TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,                    -- Kode baru: ATK-001, K3-001, dll.
  legacy_code TEXT,                            -- Kode lama Excel: 1.1, 1.2, dll.
  name TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  kind item_kind NOT NULL,
  base_unit_id UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
  min_stock NUMERIC NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
  target_stock NUMERIC NOT NULL DEFAULT 0 CHECK (target_stock >= 0),
  abc_class CHAR(1) CHECK (abc_class IN ('A', 'B', 'C')),
  default_location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  has_expiry BOOLEAN NOT NULL DEFAULT false,
  photo_path TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Konversi satuan (mis. 1 Rim = 500 Lembar/Pcs, 1 Pack = 12 Pcs)
CREATE TABLE IF NOT EXISTS unit_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  from_unit_id UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
  to_unit_id UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
  factor NUMERIC NOT NULL CHECK (factor > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_item_conversion UNIQUE(item_id, from_unit_id, to_unit_id)
);

-- 6. TABEL LEDGER: stock_movements (APPEND-ONLY)
-- ATURAN WAJIB:
-- 1. Stok adalah turunan dari stock_movements yang append-only. Dilarang UPDATE atau DELETE.
-- 2. Setiap penulisan dari klien membawa UUID yang dibuat di klien (idempoten).
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY,                          -- Dibuat di klien (UUID v4) untuk idempotensi offline
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  type movement_type NOT NULL,                  -- IN | OUT | ADJUST | REVERSAL
  qty NUMERIC NOT NULL,                         -- Satuan dasar. Nilai ADJUST bisa bertanda +/-
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,   -- Akun operator yang menginput
  person_id UUID REFERENCES people(id) ON DELETE SET NULL,       -- Pengguna fisik barang
  ref_type TEXT,                                -- PURCHASE | STOCK_TAKE | MANUAL_OUT | REVERSAL
  ref_id UUID,                                  -- ID dokumen referensi
  note TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON stock_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_occurred_at ON stock_movements(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_ref ON stock_movements(ref_type, ref_id);

-- TRIGGER PENEGAKAN APPEND-ONLY (MENOLAK UPDATE & DELETE)
CREATE OR REPLACE FUNCTION trg_prevent_stock_movements_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Pelanggaran Integritas Stok: Tabel stock_movements bersifat append-only. Operasi UPDATE dan DELETE dilarang.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_stock_movements_no_update_delete ON stock_movements;
CREATE TRIGGER trg_stock_movements_no_update_delete
BEFORE UPDATE OR DELETE ON stock_movements
FOR EACH ROW
EXECUTE FUNCTION trg_prevent_stock_movements_mutation();

-- 7. SESI STOCK OPNAME & PENEGAKAN ATURAN PENYETUJU != PENGHITUNG
CREATE TABLE IF NOT EXISTS stock_takes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  scope JSONB,
  status stock_take_status NOT NULL DEFAULT 'DRAFT',
  cutoff_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  approved_by UUID REFERENCES profiles(id) ON DELETE RESTRICT,
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stock_take_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_take_id UUID NOT NULL REFERENCES stock_takes(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  system_qty NUMERIC NOT NULL,
  counted_qty NUMERIC,
  recount_qty NUMERIC,
  counted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  counted_by_person_id UUID REFERENCES people(id) ON DELETE SET NULL,
  reason TEXT,
  photo_path TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_stock_take_item UNIQUE(stock_take_id, item_id)
);

-- PENEGAKAN ATURAN: Penghitung tidak boleh menyetujui hitungannya sendiri.
-- Enforce di database level melalui Trigger pada stock_takes & stock_take_lines
CREATE OR REPLACE FUNCTION trg_check_approver_not_counter_on_stock_take()
RETURNS TRIGGER AS $$
DECLARE
  v_approver_person_id UUID;
  v_conflict_count INT;
BEGIN
  -- Validasi dijalankan saat sesi disetujui (APPROVED) atau dibukukan (POSTED)
  IF (NEW.status IN ('APPROVED', 'POSTED') OR NEW.approved_by IS NOT NULL) THEN
    IF NEW.approved_by IS NULL THEN
      RAISE EXCEPTION 'Pelanggaran: Sesi opname tidak dapat disetujui tanpa pengesahan approved_by.';
    END IF;

    -- Dapatkan person_id penyetuju jika ada
    SELECT person_id INTO v_approver_person_id FROM profiles WHERE id = NEW.approved_by;

    -- Cek apakah penyetuju pernah menghitung baris manapun pada sesi ini
    SELECT COUNT(*) INTO v_conflict_count
    FROM stock_take_lines
    WHERE stock_take_id = NEW.id
      AND (
        counted_by = NEW.approved_by
        OR (v_approver_person_id IS NOT NULL AND counted_by_person_id = v_approver_person_id)
        OR (counted_by IS NOT NULL AND counted_by IN (
          SELECT id FROM profiles WHERE person_id IS NOT NULL AND person_id = v_approver_person_id
        ))
      );

    IF v_conflict_count > 0 THEN
      RAISE EXCEPTION 'Pelanggaran Aturan Database: Penghitung tidak boleh menyetujui hitungannya sendiri! Penyetuju tercatat menghitung % item pada sesi ini.', v_conflict_count;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_stock_takes_prevent_self_approval ON stock_takes;
CREATE TRIGGER trg_stock_takes_prevent_self_approval
BEFORE UPDATE OF status, approved_by ON stock_takes
FOR EACH ROW
EXECUTE FUNCTION trg_check_approver_not_counter_on_stock_take();

CREATE OR REPLACE FUNCTION trg_check_approver_not_counter_on_line()
RETURNS TRIGGER AS $$
DECLARE
  v_approver_id UUID;
  v_approver_person_id UUID;
BEGIN
  SELECT approved_by INTO v_approver_id FROM stock_takes WHERE id = NEW.stock_take_id;
  IF v_approver_id IS NOT NULL THEN
    SELECT person_id INTO v_approver_person_id FROM profiles WHERE id = v_approver_id;
    IF NEW.counted_by = v_approver_id OR (v_approver_person_id IS NOT NULL AND NEW.counted_by_person_id = v_approver_person_id) THEN
      RAISE EXCEPTION 'Pelanggaran Aturan Database: Penghitung tidak boleh menjadi penyetuju pada sesi ini.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_stock_take_lines_prevent_self_approval ON stock_take_lines;
CREATE TRIGGER trg_stock_take_lines_prevent_self_approval
BEFORE INSERT OR UPDATE OF counted_by, counted_by_person_id ON stock_take_lines
FOR EACH ROW
EXECUTE FUNCTION trg_check_approver_not_counter_on_line();

-- 8. TABEL OPERASIONAL PENDUKUNG (Pembelian, Harga, Aset K3, Anggaran, Audit)
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier TEXT NOT NULL,
  invoice_no TEXT,
  purchased_at DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_path TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchase_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  qty_buy NUMERIC NOT NULL CHECK (qty_buy > 0),
  buy_unit_id UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
  qty_base NUMERIC NOT NULL CHECK (qty_base > 0),
  unit_price NUMERIC NOT NULL CHECK (unit_price >= 0),
  expiry_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  unit_price_base NUMERIC NOT NULL CHECK (unit_price_base >= 0),
  source TEXT NOT NULL,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  purchase_line_id UUID REFERENCES purchase_lines(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS budget_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INT NOT NULL,
  group_code TEXT NOT NULL,
  item_id UUID REFERENCES items(id) ON DELETE SET NULL,
  label TEXT NOT NULL,
  planned_qty NUMERIC,
  planned_unit TEXT,
  planned_price NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recurring_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  month DATE NOT NULL,
  budget NUMERIC NOT NULL DEFAULT 0,
  actual NUMERIC NOT NULL DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS asset_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  asset_tag TEXT UNIQUE NOT NULL,               -- Misal: ALT-001-01
  serial_no TEXT,
  status asset_status NOT NULL DEFAULT 'AVAILABLE',
  condition TEXT NOT NULL DEFAULT 'Baik',
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  calibration_last DATE,
  calibration_due DATE,
  certificate_path TEXT,
  qr_code TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS asset_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES asset_units(id) ON DELETE CASCADE,
  type TEXT NOT NULL,                           -- PINJAM | KEMBALI | KALIBRASI | RUSAK | PERBAIKAN
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  borrower_id UUID REFERENCES people(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  condition TEXT,
  photo_path TEXT,
  note TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ppe_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE RESTRICT,
  qty NUMERIC NOT NULL CHECK (qty > 0),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  inspect_due DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  entity TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  diff JSONB,
  at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. VIEWS: SALDO STOK DARI LEDGER APPEND-ONLY
CREATE OR REPLACE VIEW v_current_stock AS
SELECT
  sm.item_id,
  i.code AS item_code,
  i.name AS item_name,
  i.base_unit_id,
  u.name AS base_unit_name,
  sm.location_id,
  l.name AS location_name,
  COALESCE(SUM(
    CASE
      WHEN sm.type = 'IN' THEN sm.qty
      WHEN sm.type = 'OUT' THEN -sm.qty
      WHEN sm.type = 'ADJUST' THEN sm.qty
      WHEN sm.type = 'REVERSAL' THEN -sm.qty
      ELSE 0
    END
  ), 0) AS current_qty
FROM stock_movements sm
JOIN items i ON i.id = sm.item_id
JOIN units u ON u.id = i.base_unit_id
LEFT JOIN locations l ON l.id = sm.location_id
GROUP BY sm.item_id, i.code, i.name, i.base_unit_id, u.name, sm.location_id, l.name;

CREATE OR REPLACE VIEW v_item_stock_summary AS
SELECT
  i.id AS item_id,
  i.code,
  i.legacy_code,
  i.name,
  i.category_id,
  c.name AS category_name,
  i.kind,
  i.base_unit_id,
  u.name AS base_unit_name,
  i.min_stock,
  i.target_stock,
  i.abc_class,
  COALESCE(SUM(
    CASE
      WHEN sm.type = 'IN' THEN sm.qty
      WHEN sm.type = 'OUT' THEN -sm.qty
      WHEN sm.type = 'ADJUST' THEN sm.qty
      WHEN sm.type = 'REVERSAL' THEN -sm.qty
      ELSE 0
    END
  ), 0) AS current_qty,
  CASE
    WHEN COALESCE(SUM(CASE WHEN sm.type = 'IN' THEN sm.qty WHEN sm.type = 'OUT' THEN -sm.qty WHEN sm.type = 'ADJUST' THEN sm.qty WHEN sm.type = 'REVERSAL' THEN -sm.qty ELSE 0 END), 0) <= 0 THEN 'HABIS'
    WHEN COALESCE(SUM(CASE WHEN sm.type = 'IN' THEN sm.qty WHEN sm.type = 'OUT' THEN -sm.qty WHEN sm.type = 'ADJUST' THEN sm.qty WHEN sm.type = 'REVERSAL' THEN -sm.qty ELSE 0 END), 0) <= i.min_stock THEN 'MENIPIS'
    ELSE 'AMAN'
  END AS stock_status
FROM items i
JOIN categories c ON c.id = i.category_id
JOIN units u ON u.id = i.base_unit_id
LEFT JOIN stock_movements sm ON sm.item_id = i.id
WHERE i.is_active = true
GROUP BY i.id, i.code, i.legacy_code, i.name, i.category_id, c.name, i.kind, i.base_unit_id, u.name, i.min_stock, i.target_stock, i.abc_class;

-- 10. ROW LEVEL SECURITY (RLS)
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_takes ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_take_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ppe_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Helper Function untuk cek role pengguna yang sedang login
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role AS $$
DECLARE
  v_role user_role;
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
  RETURN COALESCE(v_role, 'STAFF'::user_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Kebijakan RLS Master Data (Read all for authenticated, write for ADMIN/MANAJER)
CREATE POLICY "Master people read" ON people FOR SELECT TO authenticated USING (true);
CREATE POLICY "Master people write" ON people FOR ALL TO authenticated USING (current_user_role() IN ('ADMIN', 'MANAJER'));

CREATE POLICY "Profiles read" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Profiles update own or admin" ON profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR current_user_role() = 'ADMIN');

CREATE POLICY "Master categories read" ON categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Master categories write" ON categories FOR ALL TO authenticated USING (current_user_role() IN ('ADMIN', 'MANAJER'));

CREATE POLICY "Master units read" ON units FOR SELECT TO authenticated USING (true);
CREATE POLICY "Master units write" ON units FOR ALL TO authenticated USING (current_user_role() IN ('ADMIN', 'MANAJER'));

CREATE POLICY "Master locations read" ON locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Master locations write" ON locations FOR ALL TO authenticated USING (current_user_role() IN ('ADMIN', 'MANAJER'));

CREATE POLICY "Master projects read" ON projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Master projects write" ON projects FOR ALL TO authenticated USING (current_user_role() IN ('ADMIN', 'MANAJER'));

CREATE POLICY "Master items read" ON items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Master items write" ON items FOR ALL TO authenticated USING (current_user_role() IN ('ADMIN', 'MANAJER'));

CREATE POLICY "Master conversions read" ON unit_conversions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Master conversions write" ON unit_conversions FOR ALL TO authenticated USING (current_user_role() IN ('ADMIN', 'MANAJER'));

-- Kebijakan RLS stock_movements (SELECT & INSERT HANYA, TIDAK ADA UPDATE ATAU DELETE)
CREATE POLICY "stock_movements read" ON stock_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "stock_movements insert" ON stock_movements FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
-- Cabut explicit izin UPDATE dan DELETE untuk semua role
REVOKE UPDATE, DELETE ON stock_movements FROM PUBLIC, anon, authenticated;

-- Kebijakan RLS stock_takes & lines
CREATE POLICY "stock_takes read" ON stock_takes FOR SELECT TO authenticated USING (true);
CREATE POLICY "stock_takes insert" ON stock_takes FOR INSERT TO authenticated WITH CHECK (current_user_role() IN ('ADMIN', 'MANAJER'));
CREATE POLICY "stock_takes update" ON stock_takes FOR UPDATE TO authenticated USING (current_user_role() IN ('ADMIN', 'MANAJER'));

CREATE POLICY "stock_take_lines read" ON stock_take_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "stock_take_lines insert" ON stock_take_lines FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "stock_take_lines update" ON stock_take_lines FOR UPDATE TO authenticated USING (true);

-- Kebijakan RLS tabel lainnya
CREATE POLICY "purchases read" ON purchases FOR SELECT TO authenticated USING (true);
CREATE POLICY "purchases write" ON purchases FOR ALL TO authenticated USING (current_user_role() IN ('ADMIN', 'MANAJER', 'STAFF'));

CREATE POLICY "purchase_lines read" ON purchase_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "purchase_lines write" ON purchase_lines FOR ALL TO authenticated USING (current_user_role() IN ('ADMIN', 'MANAJER', 'STAFF'));

CREATE POLICY "price_history read" ON price_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "price_history write" ON price_history FOR ALL TO authenticated USING (current_user_role() IN ('ADMIN', 'MANAJER'));

CREATE POLICY "budget_lines read" ON budget_lines FOR SELECT TO authenticated USING (current_user_role() IN ('ADMIN', 'MANAJER'));
CREATE POLICY "budget_lines write" ON budget_lines FOR ALL TO authenticated USING (current_user_role() IN ('ADMIN', 'MANAJER'));

CREATE POLICY "recurring_costs read" ON recurring_costs FOR SELECT TO authenticated USING (current_user_role() IN ('ADMIN', 'MANAJER'));
CREATE POLICY "recurring_costs write" ON recurring_costs FOR ALL TO authenticated USING (current_user_role() IN ('ADMIN', 'MANAJER'));

CREATE POLICY "asset_units read" ON asset_units FOR SELECT TO authenticated USING (true);
CREATE POLICY "asset_units write" ON asset_units FOR ALL TO authenticated USING (current_user_role() IN ('ADMIN', 'MANAJER'));

CREATE POLICY "asset_events read" ON asset_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "asset_events insert" ON asset_events FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "ppe_issues read" ON ppe_issues FOR SELECT TO authenticated USING (true);
CREATE POLICY "ppe_issues insert" ON ppe_issues FOR INSERT TO authenticated WITH CHECK (current_user_role() IN ('ADMIN', 'MANAJER', 'AHLI'));

CREATE POLICY "audit_log read" ON audit_log FOR SELECT TO authenticated USING (current_user_role() IN ('ADMIN', 'MANAJER'));
CREATE POLICY "audit_log insert" ON audit_log FOR INSERT TO authenticated WITH CHECK (true);
