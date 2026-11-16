-- ==============================================================================
-- Migrasi Tambahan: Memberikan Izin BACA (SELECT) Publik/Anon pada Master Data
-- Hal ini memungkinkan PWA membaca katalog barang dan daftar karyawan
-- Izin INSERT, UPDATE, dan DELETE TETAP DILINDUNGI KETAT HANYA UNTUK ADMIN/MANAJER
-- ==============================================================================

DO $$ BEGIN
  CREATE POLICY "Master people read anon" ON people FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Master categories read anon" ON categories FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Master units read anon" ON units FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Master locations read anon" ON locations FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Master items read anon" ON items FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Master projects read anon" ON projects FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Master conversions read anon" ON unit_conversions FOR SELECT TO anon USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;
