import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/dm-templates - List user's DM templates
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get x_account_id from query params (optional filter)
    const searchParams = request.nextUrl.searchParams;
    const xAccountId = searchParams.get('x_account_id');

    let query = supabase
      .from('dm_templates')
      .select('*')
      .eq('user_id', user.id)
      .order('position', { ascending: true })
      .order('created_at', { ascending: false });

    // Filter by x_account if provided
    if (xAccountId) {
      query = query.eq('x_account_id', xAccountId);
    }

    const { data: templates, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      templates: templates || [],
    });
  } catch (error) {
    console.error('Error fetching DM templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch DM templates' },
      { status: 500 }
    );
  }
}

// POST /api/dm-templates - Create a new template
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, message_body, x_account_id } = body;

    // Validate required fields
    if (!title || !message_body) {
      return NextResponse.json(
        { error: 'title and message_body are required' },
        { status: 400 }
      );
    }

    // If x_account_id not provided, get user's primary account
    let accountId = x_account_id;
    if (!accountId) {
      const { data: primaryAccount } = await supabase
        .from('x_accounts')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_primary', true)
        .single();
      
      accountId = primaryAccount?.id;
    }

    // Get the next position
    const { data: existingTemplates } = await supabase
      .from('dm_templates')
      .select('position')
      .eq('user_id', user.id)
      .order('position', { ascending: false })
      .limit(1);

    const nextPosition = existingTemplates && existingTemplates.length > 0 
      ? existingTemplates[0].position + 1 
      : 0;

    // Create the template
    const { data: template, error } = await supabase
      .from('dm_templates')
      .insert({
        user_id: user.id,
        x_account_id: accountId,
        title,
        message_body,
        position: nextPosition,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('Error creating DM template:', error);
    return NextResponse.json(
      { error: 'Failed to create DM template' },
      { status: 500 }
    );
  }
}
