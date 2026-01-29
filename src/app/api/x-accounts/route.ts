import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/x-accounts - List user's X accounts
export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: accounts, error } = await supabase
      .from('x_accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json(accounts || []);
  } catch (error) {
    console.error('Error fetching X accounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
      { status: 500 }
    );
  }
}

// POST /api/x-accounts - Create a new X account connection
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { x_user_id, x_username, x_display_name, x_profile_image_url } = body;

    if (!x_user_id || !x_username) {
      return NextResponse.json(
        { error: 'x_user_id and x_username are required' },
        { status: 400 }
      );
    }

    // Check subscription limits
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('max_x_accounts')
      .eq('user_id', user.id)
      .single();

    const { count: currentCount } = await supabase
      .from('x_accounts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const maxAccounts = subscription?.max_x_accounts || 1;
    if ((currentCount || 0) >= maxAccounts) {
      return NextResponse.json(
        { error: 'Account limit reached. Upgrade to add more X accounts.' },
        { status: 403 }
      );
    }

    // Check if this is the first account (will be primary)
    const isPrimary = (currentCount || 0) === 0;

    // Create the X account
    const { data: account, error } = await supabase
      .from('x_accounts')
      .insert({
        user_id: user.id,
        x_user_id,
        x_username,
        x_display_name: x_display_name || null,
        x_profile_image_url: x_profile_image_url || null,
        is_primary: isPrimary,
      })
      .select()
      .single();

    if (error) {
      // Check for unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'This X account is already connected' },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    console.error('Error creating X account:', error);
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}
