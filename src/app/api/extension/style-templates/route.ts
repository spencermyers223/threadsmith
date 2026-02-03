import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/extension/style-templates - List user's style templates
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const supabase = await createClient()

    // Verify token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get user's style templates
    const { data: templates, error } = await supabase
      .from('style_templates')
      .select('id, title, description, admired_account_username, admired_account_avatar_url, content_type, tweets, profile_data, analyzed_at, tweets_analyzed, created_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching style templates:', error)
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
    }

    return NextResponse.json({ 
      templates: templates || [],
      count: templates?.length || 0
    })

  } catch (error) {
    console.error('Extension style-templates error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/extension/style-templates - Create new style template
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const supabase = await createClient()

    // Verify token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      title, 
      description, 
      admired_account_username,
      admired_account_display_name,
      admired_account_avatar_url,
      content_type = 'tweet',
      initial_tweet // Optional: first tweet to add
    } = body

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    // Build tweets array
    const tweets = initial_tweet ? [{
      text: initial_tweet.text,
      url: initial_tweet.url || null,
      added_at: new Date().toISOString()
    }] : []

    // Create the template
    const { data: template, error } = await supabase
      .from('style_templates')
      .insert({
        user_id: user.id,
        title,
        description: description || null,
        admired_account_username: admired_account_username || null,
        admired_account_display_name: admired_account_display_name || null,
        admired_account_avatar_url: admired_account_avatar_url || null,
        content_type,
        tweets
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating style template:', error)
      return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      template 
    })

  } catch (error) {
    console.error('Extension create style-template error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
