const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '../.env.local');
const env = fs.readFileSync(envPath, 'utf8');
const SUPABASE_URL = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const SUPABASE_KEY = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
  const { data: users } = await supabase.from('profiles').select('id, nama, role, allowed_pages');
  console.log("USERS:", users);
  
  const { data: akses } = await supabase.from('kas_akses').select('user_id, kas_id, kas(nama)');
  console.log("KAS_AKSES:", akses);

  const { data: kategori } = await supabase.from('kategori_persembahan').select('id, nama, kas_id');
  console.log("KATEGORI:", kategori);
}

check().catch(console.error);
