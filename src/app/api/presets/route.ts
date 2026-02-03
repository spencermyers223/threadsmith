import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/presets - List user's presets
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
      .from('presets')
      .select(`
        *,
        style_template:style_templates(id, title, description, admired_account_username)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (xAccountId) {
      query = query.eq('x_account_id', xAccountId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching presets:', error)
      return NextResponse.json({ error: 'Failed to fetch presets' }, { status: 500 })
    }

    return NextResponse.json({ presets: data })
  } catch (error) {
    console.error('Presets GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/presets - Create a new preset
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      name, 
      style_template_id,
      post_template_id,
      attached_file_ids,
      x_account_id 
    } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    if (!style_template_id) {
      return NextResponse.json({ error: 'Style template is required' }, { status: 400 })
    }

    if (!post_template_id) {
      return NextResponse.json({ error: 'Post template is required' }, { status: 400 })
    }

    // Verify style template belongs to user
    const { data: styleTemplate, error: styleError } = await supabase
      .from('style_templates')
      .select('id')
      .eq('id', style_template_id)
      .eq('user_id', user.id)
      .single()

    if (styleError || !styleTemplate) {
      return NextResponse.json({ error: 'Invalid style template' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('presets')
      .insert({
        user_id: user.id,
        x_account_id: x_account_id || null,
        name,
        style_template_id,
        post_template_id,
        attached_file_ids: attached_file_ids || []
      })
      .select(`
        *,
        style_template:style_templates(id, title, description, admired_account_username)
      `)
      .single()

    if (error) {
      console.error('Error creating preset:', error)
      return NextResponse.json({ error: 'Failed to create preset' }, { status: 500 })
    }

    return NextResponse.json({ preset: data }, { status: 201 })
  } catch (error) {
    console.error('Presets POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
