import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/presets/[id] - Get a single preset
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('presets')
      .select(`
        *,
        style_template:style_templates(*)
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Preset not found' }, { status: 404 })
      }
      console.error('Error fetching preset:', error)
      return NextResponse.json({ error: 'Failed to fetch preset' }, { status: 500 })
    }

    return NextResponse.json({ preset: data })
  } catch (error) {
    console.error('Preset GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/presets/[id] - Update a preset
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const allowedFields = [
      'name',
      'content_type',
      'style_template_id', 
      'post_template_id',
      'attached_file_ids'
    ]

    // Filter to only allowed fields
    const updates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Validate content_type if provided
    if (updates.content_type) {
      const validContentTypes = ['tweet', 'thread']
      if (!validContentTypes.includes(updates.content_type as string)) {
        return NextResponse.json({ error: 'Invalid content type' }, { status: 400 })
      }
    }

    // If updating style_template_id, verify it belongs to user
    if (updates.style_template_id) {
      const { data: styleTemplate, error: styleError } = await supabase
        .from('style_templates')
        .select('id')
        .eq('id', updates.style_template_id)
        .eq('user_id', user.id)
        .single()

      if (styleError || !styleTemplate) {
        return NextResponse.json({ error: 'Invalid style template' }, { status: 400 })
      }
    }

    const { data, error } = await supabase
      .from('presets')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select(`
        *,
        style_template:style_templates(id, title, description, admired_account_username)
      `)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Preset not found' }, { status: 404 })
      }
      console.error('Error updating preset:', error)
      return NextResponse.json({ error: 'Failed to update preset' }, { status: 500 })
    }

    return NextResponse.json({ preset: data })
  } catch (error) {
    console.error('Preset PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/presets/[id] - Delete a preset
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('presets')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting preset:', error)
      return NextResponse.json({ error: 'Failed to delete preset' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Preset DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
