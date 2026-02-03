import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: { schema: 'public' },
  auth: { persistSession: false }
})

async function run() {
  console.log('Checking tables...')
  
  const { data, error } = await supabase
    .from('account_analyses')
    .select('id')
    .limit(1)
  
  if (error && error.code === '42P01') {
    console.log('❌ account_analyses table does not exist')
  } else if (error) {
    console.log('⚠️ account_analyses error:', error.message)
  } else {
    console.log('✓ account_analyses table exists')
  }
  
  const { data: d2, error: e2 } = await supabase
    .from('saved_inspirations')
    .select('id')
    .limit(1)
  
  if (e2 && e2.code === '42P01') {
    console.log('❌ saved_inspirations table does not exist')
  } else if (e2) {
    console.log('⚠️ saved_inspirations error:', e2.message)
  } else {
    console.log('✓ saved_inspirations table exists')
  }
}

run()
