import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// CORS headers for extension requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonResponse(data: unknown, options: { status?: number } = {}) {
  return NextResponse.json(data, { 
    status: options.status || 200,
    headers: corsHeaders 
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// GET - List admired accounts
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return jsonResponse({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('content_profiles')
      .select('admired_accounts')
      .eq('user_id', user.id)
      .single();

    return jsonResponse({
      accounts: profile?.admired_accounts || [],
    });
  } catch (error) {
    console.error('Error fetching admired accounts:', error);
    return jsonResponse({ error: 'Failed to fetch admired accounts' }, { status: 500 });
  }
}

// POST - Add an admired account
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return jsonResponse({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { username } = body;

    if (!username) {
      return jsonResponse({ error: 'Username is required' }, { status: 400 });
    }

    // Normalize username (remove @ if present)
    const normalizedUsername = username.replace(/^@/, '').toLowerCase();

    // Get current admired accounts
    const { data: profile } = await supabase
      .from('content_profiles')
      .select('admired_accounts')
      .eq('user_id', user.id)
      .single();

    const currentAccounts: string[] = profile?.admired_accounts || [];

    // Check if already added
    if (currentAccounts.map(a => a.toLowerCase()).includes(normalizedUsername)) {
      return jsonResponse({ 
        message: 'Account already in your voice profile',
        accounts: currentAccounts,
      });
    }

    // Add to list (max 10 accounts)
    const newAccounts = [...currentAccounts, normalizedUsername].slice(0, 10);

    // Upsert content_profiles
    const { error } = await supabase
      .from('content_profiles')
      .upsert({
        user_id: user.id,
        admired_accounts: newAccounts,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (error) throw error;

    return jsonResponse({
      message: `Added @${normalizedUsername} to your voice profile`,
      accounts: newAccounts,
    });
  } catch (error) {
    console.error('Error adding admired account:', error);
    return jsonResponse({ error: 'Failed to add account' }, { status: 500 });
  }
}

// DELETE - Remove an admired account
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return jsonResponse({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return jsonResponse({ error: 'Username is required' }, { status: 400 });
    }

    const normalizedUsername = username.replace(/^@/, '').toLowerCase();

    // Get current admired accounts
    const { data: profile } = await supabase
      .from('content_profiles')
      .select('admired_accounts')
      .eq('user_id', user.id)
      .single();

    const currentAccounts: string[] = profile?.admired_accounts || [];
    const newAccounts = currentAccounts.filter(a => a.toLowerCase() !== normalizedUsername);

    // Update
    const { error } = await supabase
      .from('content_profiles')
      .update({
        admired_accounts: newAccounts,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (error) throw error;

    return jsonResponse({
      message: `Removed @${normalizedUsername} from your voice profile`,
      accounts: newAccounts,
    });
  } catch (error) {
    console.error('Error removing admired account:', error);
    return jsonResponse({ error: 'Failed to remove account' }, { status: 500 });
  }
}
