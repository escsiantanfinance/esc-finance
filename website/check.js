const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '.env.local');
const env = fs.readFileSync(envPath, 'utf8');
const SUPABASE_URL = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const SUPABASE_KEY = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
  const { data: s } = await supabase.from('sesi_ibadah').select('*').order('created_at', { ascending: false }).limit(3);
  console.log('3 LATEST SESI:', s);
  const { data: p } = await supabase.from('persembahan').select('*').order('tanggal', { ascending: false }).limit(5);
  console.log('5 LATEST PERSEMBAHAN:', p);
}
check();
