import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable() {
  const { data, error } = await supabase
    .from('system_cache')
    .select('key')
    .limit(1);
    
  if (error && error.code === 'PGRST205') {
    console.log('TABLE_NOT_EXISTS');
  } else if (error) {
    console.log('ERROR:', error.message);
  } else {
    console.log('TABLE_EXISTS');
  }
}

checkTable();
