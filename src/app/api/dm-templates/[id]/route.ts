import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/dm-templates/[id] - Get a specific template
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: template, error } = await supabase
      .from('dm_templates')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error('Error fetching DM template:', error);
    return NextResponse.json(
      { error: 'Failed to fetch DM template' },
      { status: 500 }
    );
  }
}

// PUT /api/dm-templates/[id] - Update a template
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, message_body, position } = body;

    // Build update object
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    
    if (title !== undefined) updates.title = title;
    if (message_body !== undefined) updates.message_body = message_body;
    if (position !== undefined) updates.position = position;

    const { data: template, error } = await supabase
      .from('dm_templates')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error('Error updating DM template:', error);
    return NextResponse.json(
      { error: 'Failed to update DM template' },
      { status: 500 }
    );
  }
}

// DELETE /api/dm-templates/[id] - Delete a template
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('dm_templates')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting DM template:', error);
    return NextResponse.json(
      { error: 'Failed to delete DM template' },
      { status: 500 }
    );
  }
}

// PATCH /api/dm-templates/[id] - Increment usage counter
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Increment times_used
    const { error } = await supabase
      .rpc('increment_dm_template_usage', { template_id: id, owner_id: user.id });

    if (error) {
      // Fallback: manual increment if RPC doesn't exist
      const { data: current } = await supabase
        .from('dm_templates')
        .select('times_used')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (current) {
        await supabase
          .from('dm_templates')
          .update({ times_used: (current.times_used || 0) + 1 })
          .eq('id', id)
          .eq('user_id', user.id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error incrementing DM template usage:', error);
    return NextResponse.json(
      { error: 'Failed to update usage' },
      { status: 500 }
    );
  }
}
