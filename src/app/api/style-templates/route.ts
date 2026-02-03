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

    // Optional filters
    const { searchParams } = new URL(request.url)
    const xAccountId = searchParams.get('x_account_id')
    const contentType = searchParams.get('content_type') // 'tweet' | 'thread' | 'article'

    let query = supabase
      .from('style_templates')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (xAccountId) {
      query = query.eq('x_account_id', xAccountId)
    }

    // Filter by content type if specified
    if (contentType) {
      query = query.eq('content_type', contentType)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching style templates:', error)
      return NextResponse.json({ error: 'Failed to fetch style templates' }, { status: 500 })
    }

    // Add default content_type for templates without it (backwards compatibility)
    const templatesWithType = (data || []).map(t => ({
      ...t,
      content_type: t.content_type || 'tweet'
    }))

    return NextResponse.json({ templates: templatesWithType })
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
      x_account_id,
      content_type, // 'tweet' | 'thread' | 'article'
      profile_data // Opus AI analysis data
    } = body

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    // Validate content_type
    const validContentTypes = ['tweet', 'thread', 'article']
    const finalContentType = validContentTypes.includes(content_type) ? content_type : 'tweet'

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
        tweets: tweets || [],
        content_type: finalContentType,
        profile_data: profile_data || null,
        analyzed_at: profile_data ? new Date().toISOString() : null
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
