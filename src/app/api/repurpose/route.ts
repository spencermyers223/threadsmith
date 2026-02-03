import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET - List saved inspirations
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const xAccountId = searchParams.get('x_account_id')

  let query = supabase
    .from('saved_inspirations')
    .select('*')
    .eq('user_id', user.id)
    .order('saved_at', { ascending: false })

  if (xAccountId) {
    query = query.eq('x_account_id', xAccountId)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ inspirations: data || [] })
}
