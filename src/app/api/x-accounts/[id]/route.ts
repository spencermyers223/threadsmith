import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/x-accounts/[id] - Get a specific X account
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: account, error } = await supabase
      .from('x_accounts')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    return NextResponse.json(account);
  } catch (error) {
    console.error('Error fetching X account:', error);
    return NextResponse.json(
      { error: 'Failed to fetch account' },
      { status: 500 }
    );
  }
}

// PATCH /api/x-accounts/[id] - Update X account settings
export async function PATCH(
  request: Request,
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
    const { x_display_name, x_profile_image_url, is_primary } = body;

    // If setting as primary, unset other accounts first
    if (is_primary) {
      await supabase
        .from('x_accounts')
        .update({ is_primary: false })
        .eq('user_id', user.id)
        .neq('id', id);
    }

    const { data: account, error } = await supabase
      .from('x_accounts')
      .update({
        ...(x_display_name !== undefined && { x_display_name }),
        ...(x_profile_image_url !== undefined && { x_profile_image_url }),
        ...(is_primary !== undefined && { is_primary }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    return NextResponse.json(account);
  } catch (error) {
    console.error('Error updating X account:', error);
    return NextResponse.json(
      { error: 'Failed to update account' },
      { status: 500 }
    );
  }
}

// DELETE /api/x-accounts/[id] - Remove X account
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if this is the only account
    const { count } = await supabase
      .from('x_accounts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if ((count || 0) <= 1) {
      return NextResponse.json(
        { error: 'Cannot remove your only X account' },
        { status: 400 }
      );
    }

    // Check if this is the primary account
    const { data: account } = await supabase
      .from('x_accounts')
      .select('is_primary')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    const wasPrimary = account?.is_primary;

    // Delete the account (cascades to related data)
    const { error } = await supabase
      .from('x_accounts')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    // If we deleted the primary, make the oldest remaining account primary
    if (wasPrimary) {
      const { data: oldest } = await supabase
        .from('x_accounts')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (oldest) {
        await supabase
          .from('x_accounts')
          .update({ is_primary: true })
          .eq('id', oldest.id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting X account:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
