import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zyjyvcqelpumfrdpwvqc.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Check if the new tables exist
const tables = ['style_templates', 'presets', 'user_customization'];

for (const table of tables) {
  const { data, error } = await supabase.from(table).select('id').limit(1);
  if (error && error.code === '42P01') {
    console.log(`❌ ${table}: does not exist`);
  } else if (error) {
    console.log(`⚠️ ${table}: ${error.message}`);
  } else {
    console.log(`✅ ${table}: exists`);
  }
}
