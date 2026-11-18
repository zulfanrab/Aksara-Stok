-- ==============================================================================
-- MIGRASI: PENGUNCIAN MASTER BARANG, HAK AKSES ADMIN & AUDIT LOG LENGKAP
-- PT AKSARA RIKSA PERDANA
-- Tanggal: 18 November 2026
-- ==============================================================================

-- 1. Pastikan Tabel audit_log Memiliki Struktur Sesuai Standar
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  entity TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,                         -- CREATE | UPDATE | DEACTIVATE | ACTIVATE
  diff JSONB,                                   -- { "field": { "old": val, "new": val } }
  at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Izin RLS audit_log: Hanya ADMIN & MANAJER yang boleh membaca, penulisan via trigger/service
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_log read" ON audit_log;
CREATE POLICY "audit_log read" ON audit_log FOR SELECT TO authenticated
  USING (current_user_role() IN ('ADMIN', 'MANAJER'));

DROP POLICY IF EXISTS "audit_log insert" ON audit_log;
CREATE POLICY "audit_log insert" ON audit_log FOR INSERT TO authenticated
  WITH CHECK (true);


-- 2. Trigger Penegakan: Kunci Satuan Dasar Jika Sudah Ada Transaksi
-- (Catatan: Kode barang BOLEH diedit/dikoreksi oleh Admin karena referensi mutasi stok memakai item_id UUID)
CREATE OR REPLACE FUNCTION trg_lock_item_code_and_unit()
RETURNS TRIGGER AS $$
DECLARE
  v_has_tx BOOLEAN;
BEGIN
  -- Cek apakah satuan dasar berubah pada barang yang sudah memiliki transaksi
  IF (OLD.base_unit_id <> NEW.base_unit_id) THEN
    -- Periksa apakah barang sudah memiliki transaksi di ledger stock_movements
    SELECT EXISTS(
      SELECT 1 FROM stock_movements WHERE item_id = OLD.id LIMIT 1
    ) INTO v_has_tx;

    IF v_has_tx THEN
      RAISE EXCEPTION 'Pelanggaran Integritas Database: Barang % telah memiliki riwayat mutasi stok. Satuan dasar tidak boleh diubah agar data historis tidak rusak.', OLD.code;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_items_lock_code_unit ON items;
CREATE TRIGGER trg_items_lock_code_unit
BEFORE UPDATE ON items
FOR EACH ROW
EXECUTE FUNCTION trg_lock_item_code_and_unit();


-- 3. Trigger Audit Log Otomatis untuk Tabel items
-- Merekam siapa, kapan, field apa yang berubah, nilai lama, dan nilai baru
CREATE OR REPLACE FUNCTION trg_audit_items_mutation()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_diff JSONB := '{}'::jsonb;
  v_action TEXT;
BEGIN
  v_user_id := auth.uid();

  IF TG_OP = 'INSERT' THEN
    v_action := 'CREATE';
    v_diff := jsonb_build_object(
      'code', jsonb_build_object('new', NEW.code),
      'name', jsonb_build_object('new', NEW.name),
      'category_id', jsonb_build_object('new', NEW.category_id),
      'base_unit_id', jsonb_build_object('new', NEW.base_unit_id),
      'min_stock', jsonb_build_object('new', NEW.min_stock),
      'is_active', jsonb_build_object('new', NEW.is_active)
    );

    INSERT INTO audit_log (user_id, entity, entity_id, action, diff, at)
    VALUES (v_user_id, 'items', NEW.id, v_action, v_diff, now());

  ELSIF TG_OP = 'UPDATE' THEN
    -- Deteksi aksi khusus nonaktifkan/aktifkan
    IF OLD.is_active = true AND NEW.is_active = false THEN
      v_action := 'DEACTIVATE';
    ELSIF OLD.is_active = false AND NEW.is_active = true THEN
      v_action := 'ACTIVATE';
    ELSE
      v_action := 'UPDATE';
    END IF;

    -- Kumpulkan rincian field yang berubah
    IF OLD.code <> NEW.code THEN
      v_diff := v_diff || jsonb_build_object('code', jsonb_build_object('old', OLD.code, 'new', NEW.code));
    END IF;
    IF OLD.name <> NEW.name THEN
      v_diff := v_diff || jsonb_build_object('name', jsonb_build_object('old', OLD.name, 'new', NEW.name));
    END IF;
    IF OLD.category_id <> NEW.category_id THEN
      v_diff := v_diff || jsonb_build_object('category_id', jsonb_build_object('old', OLD.category_id, 'new', NEW.category_id));
    END IF;
    IF OLD.base_unit_id <> NEW.base_unit_id THEN
      v_diff := v_diff || jsonb_build_object('base_unit_id', jsonb_build_object('old', OLD.base_unit_id, 'new', NEW.base_unit_id));
    END IF;
    IF OLD.min_stock <> NEW.min_stock THEN
      v_diff := v_diff || jsonb_build_object('min_stock', jsonb_build_object('old', OLD.min_stock, 'new', NEW.min_stock));
    END IF;
    IF (OLD.default_location_id IS DISTINCT FROM NEW.default_location_id) THEN
      v_diff := v_diff || jsonb_build_object('default_location_id', jsonb_build_object('old', OLD.default_location_id, 'new', NEW.default_location_id));
    END IF;
    IF OLD.is_active <> NEW.is_active THEN
      v_diff := v_diff || jsonb_build_object('is_active', jsonb_build_object('old', OLD.is_active, 'new', NEW.is_active));
    END IF;

    -- Hanya catat jika memang ada perubahan data
    IF v_diff <> '{}'::jsonb THEN
      INSERT INTO audit_log (user_id, entity, entity_id, action, diff, at)
      VALUES (v_user_id, 'items', NEW.id, v_action, v_diff, now());
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_items_audit ON items;
CREATE TRIGGER trg_items_audit
AFTER INSERT OR UPDATE ON items
FOR EACH ROW
EXECUTE FUNCTION trg_audit_items_mutation();


-- 4. Perketat RLS: Hanya Role ADMIN yang Boleh Menambah, Mengubah, dan Menghapus items
DROP POLICY IF EXISTS "Master items write" ON items;
CREATE POLICY "Master items write" ON items FOR ALL TO authenticated
  USING (current_user_role() = 'ADMIN')
  WITH CHECK (current_user_role() = 'ADMIN');
