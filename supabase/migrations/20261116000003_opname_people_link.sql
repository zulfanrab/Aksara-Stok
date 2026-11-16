-- ==============================================================================
-- Migrasi Tambahan: Memungkinkan stock_takes dihubungkan langsung ke people
-- untuk started_by_person_id dan approved_by_person_id
-- ==============================================================================

ALTER TABLE stock_takes ALTER COLUMN started_by DROP NOT NULL;
ALTER TABLE stock_takes ADD COLUMN IF NOT EXISTS started_by_person_id UUID REFERENCES people(id) ON DELETE SET NULL;
ALTER TABLE stock_takes ADD COLUMN IF NOT EXISTS approved_by_person_id UUID REFERENCES people(id) ON DELETE SET NULL;

-- Perbarui Trigger agar memeriksa baik approved_by (profiles) maupun approved_by_person_id (people)
CREATE OR REPLACE FUNCTION trg_check_approver_not_counter_on_stock_take()
RETURNS TRIGGER AS $$
DECLARE
  v_approver_person_id UUID;
  v_conflict_count INT;
BEGIN
  IF (NEW.status IN ('APPROVED', 'POSTED') OR NEW.approved_by IS NOT NULL OR NEW.approved_by_person_id IS NOT NULL) THEN
    IF NEW.approved_by IS NULL AND NEW.approved_by_person_id IS NULL THEN
      RAISE EXCEPTION 'Pelanggaran: Sesi opname tidak dapat disetujui tanpa pengesahan penyetuju.';
    END IF;

    -- Ambil person_id dari profil penyetuju jika ada
    IF NEW.approved_by IS NOT NULL THEN
      SELECT person_id INTO v_approver_person_id FROM profiles WHERE id = NEW.approved_by;
    ELSE
      v_approver_person_id := NEW.approved_by_person_id;
    END IF;

    -- Cek apakah penyetuju pernah menghitung baris manapun pada sesi ini
    SELECT COUNT(*) INTO v_conflict_count
    FROM stock_take_lines
    WHERE stock_take_id = NEW.id
      AND (
        (NEW.approved_by IS NOT NULL AND counted_by = NEW.approved_by)
        OR (v_approver_person_id IS NOT NULL AND counted_by_person_id = v_approver_person_id)
        OR (NEW.approved_by_person_id IS NOT NULL AND counted_by_person_id = NEW.approved_by_person_id)
      );

    IF v_conflict_count > 0 THEN
      RAISE EXCEPTION 'Pelanggaran Aturan Database: Penghitung tidak boleh menyetujui hitungannya sendiri! Penyetuju tercatat menghitung % item pada sesi ini.', v_conflict_count;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
