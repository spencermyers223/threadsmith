import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/style-templates - List user's style templates
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Optional filter by x_account_id
    const { searchParams } = new URL(request.url)
    const xAccountId = searchParams.get('x_account_id')

    let query = supabase
      .from('style_templates')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (xAccountId) {
      query = query.eq('x_account_id', xAccountId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching style templates:', error)
      return NextResponse.json({ error: 'Failed to fetch style templates' }, { status: 500 })
    }

    return NextResponse.json({ templates: data })
  } catch (error) {
    console.error('Style templates GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/style-templates - Create a new style template
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      title, 
      description, 
      admired_account_username,
      admired_account_display_name,
      admired_account_avatar_url,
      tweets,
      x_account_id 
    } = body

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('style_templates')
      .insert({
        user_id: user.id,
        x_account_id: x_account_id || null,
        title,
        description: description || null,
        admired_account_username: admired_account_username || null,
        admired_account_display_name: admired_account_display_name || null,
        admired_account_avatar_url: admired_account_avatar_url || null,
        tweets: tweets || []
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating style template:', error)
      return NextResponse.json({ error: 'Failed to create style template' }, { status: 500 })
    }

    return NextResponse.json({ template: data }, { status: 201 })
  } catch (error) {
    console.error('Style templates POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
