import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
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

// Helper to get user from either Bearer token or cookies
async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  
  // Try Bearer token first (for extension requests)
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (!error && user) {
      return { user, supabase };
    }
  }
  
  // Fall back to cookie-based auth (for web app requests)
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { user, supabase };
}

// GET - List admired accounts
export async function GET(request: NextRequest) {
  try {
    const { user, supabase } = await getAuthenticatedUser(request);
    
    if (!user) {
      return jsonResponse({ error: 'Unauthorized' }, { status: 401 });
    }

    const xAccountId = request.nextUrl.searchParams.get('x_account_id');
    
    if (!xAccountId) {
      return jsonResponse({ error: 'x_account_id is required' }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from('content_profiles')
      .select('admired_accounts')
      .eq('x_account_id', xAccountId)
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
    const { user, supabase } = await getAuthenticatedUser(request);
    
    if (!user) {
      return jsonResponse({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { username } = body;
    let { x_account_id } = body;

    if (!username) {
      return jsonResponse({ error: 'Username is required' }, { status: 400 });
    }
    
    // If x_account_id not provided (e.g., from extension), get user's first X account
    if (!x_account_id) {
      const { data: xAccounts } = await supabase
        .from('x_accounts')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);
      
      if (!xAccounts || xAccounts.length === 0) {
        return jsonResponse({ error: 'No X account connected. Please connect your X account at xthread.io first.' }, { status: 400 });
      }
      x_account_id = xAccounts[0].id;
    }

    // Normalize username (remove @ if present)
    const normalizedUsername = username.replace(/^@/, '').toLowerCase();

    // Get current admired accounts
    const { data: profile } = await supabase
      .from('content_profiles')
      .select('admired_accounts')
      .eq('x_account_id', x_account_id)
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

    // Update content_profiles
    const { error } = await supabase
      .from('content_profiles')
      .update({
        admired_accounts: newAccounts,
        updated_at: new Date().toISOString(),
      })
      .eq('x_account_id', x_account_id);

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
    const { user, supabase } = await getAuthenticatedUser(request);
    
    if (!user) {
      return jsonResponse({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    const xAccountId = searchParams.get('x_account_id');

    if (!username) {
      return jsonResponse({ error: 'Username is required' }, { status: 400 });
    }
    
    if (!xAccountId) {
      return jsonResponse({ error: 'x_account_id is required' }, { status: 400 });
    }

    const normalizedUsername = username.replace(/^@/, '').toLowerCase();

    // Get current admired accounts
    const { data: profile } = await supabase
      .from('content_profiles')
      .select('admired_accounts')
      .eq('x_account_id', xAccountId)
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
      .eq('x_account_id', xAccountId);

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
