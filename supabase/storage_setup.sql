-- ============================================================
-- ESC FINANCE — Setup Storage (bucket + RLS policy)
-- Jalankan SEKALI di Supabase SQL Editor SETELAH schema.sql.
-- WAJIB: tanpa policy INSERT di bawah, upload tanda tangan dari
-- aplikasi mobile akan gagal 403 (RLS), sehingga sesi tidak bisa
-- dikunci. Ini sudah pernah menjebak di demo — jangan dilewati.
-- ============================================================

-- 1) Bucket
insert into storage.buckets (id, name, public) values
  ('signatures', 'signatures', true),   -- tanda tangan sesi ibadah (mobile)
  ('bukti',      'bukti',      true),    -- foto nota pengeluaran (web)
  ('backups',    'backups',    false)    -- cadangan terenkripsi (server-only)
on conflict (id) do nothing;

-- 2) Policy bucket signatures (upload dari user terautentikasi)
drop policy if exists signatures_insert on storage.objects;
drop policy if exists signatures_update on storage.objects;
drop policy if exists signatures_read   on storage.objects;
create policy signatures_insert on storage.objects
  for insert to authenticated with check (bucket_id = 'signatures');
create policy signatures_update on storage.objects
  for update to authenticated using (bucket_id = 'signatures');
create policy signatures_read on storage.objects
  for select using (bucket_id = 'signatures');

-- 3) Policy bucket bukti (upload nota dari web)
drop policy if exists bukti_insert on storage.objects;
drop policy if exists bukti_read   on storage.objects;
create policy bukti_insert on storage.objects
  for insert to authenticated with check (bucket_id = 'bukti');
create policy bukti_read on storage.objects
  for select using (bucket_id = 'bukti');

-- backups bersifat privat & hanya diakses server (service_role) — tanpa policy publik.
