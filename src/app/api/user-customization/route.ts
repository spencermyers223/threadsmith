import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/user-customization - Get user's customization settings
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
      .from('user_customization')
      .select('*')
      .eq('user_id', user.id)

    if (xAccountId) {
      query = query.eq('x_account_id', xAccountId)
    } else {
      query = query.is('x_account_id', null)
    }

    const { data, error } = await query.single()

    if (error) {
      // No customization exists yet - return defaults
      if (error.code === 'PGRST116') {
        return NextResponse.json({ 
          customization: {
            tone_preferences: {},
            content_niches: [],
            goals_audience: null,
            style_description: null,
            admired_accounts: [],
            outreach_templates: []
          }
        })
      }
      console.error('Error fetching user customization:', error)
      return NextResponse.json({ error: 'Failed to fetch customization' }, { status: 500 })
    }

    return NextResponse.json({ customization: data })
  } catch (error) {
    console.error('User customization GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/user-customization - Create or update user's customization (upsert)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      x_account_id,
      tone_preferences,
      content_niches,
      goals_audience,
      style_description,
      admired_accounts,
      outreach_templates
    } = body

    const customizationData = {
      user_id: user.id,
      x_account_id: x_account_id || null,
      ...(tone_preferences !== undefined && { tone_preferences }),
      ...(content_niches !== undefined && { content_niches }),
      ...(goals_audience !== undefined && { goals_audience }),
      ...(style_description !== undefined && { style_description }),
      ...(admired_accounts !== undefined && { admired_accounts }),
      ...(outreach_templates !== undefined && { outreach_templates })
    }

    const { data, error } = await supabase
      .from('user_customization')
      .upsert(customizationData, {
        onConflict: 'user_id,x_account_id'
      })
      .select()
      .single()

    if (error) {
      console.error('Error upserting user customization:', error)
      return NextResponse.json({ error: 'Failed to save customization' }, { status: 500 })
    }

    return NextResponse.json({ customization: data })
  } catch (error) {
    console.error('User customization POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/user-customization - Partial update of customization
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { x_account_id, ...updates } = body

    const allowedFields = [
      'tone_preferences',
      'content_niches',
      'goals_audience',
      'style_description',
      'admired_accounts',
      'outreach_templates'
    ]

    // Filter to only allowed fields
    const filteredUpdates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (field in updates) {
        filteredUpdates[field] = updates[field]
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // First, ensure a record exists (create if not)
    let query = supabase
      .from('user_customization')
      .select('id')
      .eq('user_id', user.id)

    if (x_account_id) {
      query = query.eq('x_account_id', x_account_id)
    } else {
      query = query.is('x_account_id', null)
    }

    const { data: existing } = await query.single()

    if (!existing) {
      // Create new record with updates
      const { data, error } = await supabase
        .from('user_customization')
        .insert({
          user_id: user.id,
          x_account_id: x_account_id || null,
          ...filteredUpdates
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating user customization:', error)
        return NextResponse.json({ error: 'Failed to create customization' }, { status: 500 })
      }

      return NextResponse.json({ customization: data })
    }

    // Update existing record
    let updateQuery = supabase
      .from('user_customization')
      .update(filteredUpdates)
      .eq('user_id', user.id)

    if (x_account_id) {
      updateQuery = updateQuery.eq('x_account_id', x_account_id)
    } else {
      updateQuery = updateQuery.is('x_account_id', null)
    }

    const { data, error } = await updateQuery.select().single()

    if (error) {
      console.error('Error updating user customization:', error)
      return NextResponse.json({ error: 'Failed to update customization' }, { status: 500 })
    }

    return NextResponse.json({ customization: data })
  } catch (error) {
    console.error('User customization PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
