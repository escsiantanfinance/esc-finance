const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '../.env.local');
const env = fs.readFileSync(envPath, 'utf8');
const SUPABASE_URL = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const SUPABASE_KEY = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Kas IDs dari database
const KAS_KIDS   = 'd8245790-ede2-4ae0-b7af-04c54fb8249a';
const KAS_BIMBEL = 'b8791678-9583-4f09-a406-398076fdf134';

async function addKategori() {
  const rows = [
    // Kids
    { nama: 'Persembahan Kids',   kas_id: KAS_KIDS,   is_perpuluhan: false, butuh_nama: false, urutan: 1, is_aktif: true, warna: '#3B82F6' },
    { nama: 'Perpuluhan Kids',    kas_id: KAS_KIDS,   is_perpuluhan: true,  butuh_nama: true,  urutan: 2, is_aktif: true, warna: '#10B981' },
    // Bimbel
    { nama: 'Persembahan Bimbel', kas_id: KAS_BIMBEL, is_perpuluhan: false, butuh_nama: false, urutan: 3, is_aktif: true, warna: '#8B5CF6' },
    { nama: 'Perpuluhan Bimbel',  kas_id: KAS_BIMBEL, is_perpuluhan: true,  butuh_nama: true,  urutan: 4, is_aktif: true, warna: '#F59E0B' },
  ];

  const { data, error } = await supabase.from('kategori_persembahan').insert(rows).select();
  if (error) {
    console.error('ERROR:', error.message);
  } else {
    console.log('Berhasil menambahkan', data.length, 'kategori:');
    data.forEach(k => console.log(' -', k.nama, '→ kas_id:', k.kas_id));
  }
}

addKategori();
