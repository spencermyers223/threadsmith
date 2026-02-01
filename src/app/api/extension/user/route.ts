import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// CORS headers for extension requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Helper to add CORS headers to responses
function jsonResponse(data: unknown, options: { status?: number } = {}) {
  return NextResponse.json(data, { 
    status: options.status || 200,
    headers: corsHeaders 
  });
}

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return jsonResponse(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Get subscription status
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('status, plan_type')
      .eq('user_id', user.id)
      .single();

    // Log subscription lookup for debugging (remove in production)
    if (subError && subError.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is expected for users without subscriptions
      console.error('Subscription lookup error:', subError);
    }

    const isPremium = subscription?.status === 'active' || 
                      subscription?.status === 'trialing' ||
                      subscription?.plan_type === 'lifetime';

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, display_name, avatar_url')
      .eq('id', user.id)
      .single();

    // Get X account username (try primary first, then any)
    let xAccount = null;
    const { data: primaryAccount } = await supabase
      .from('x_accounts')
      .select('x_username, x_display_name, x_profile_image_url')
      .eq('user_id', user.id)
      .eq('is_primary', true)
      .single();
    
    if (primaryAccount) {
      xAccount = primaryAccount;
    } else {
      // Fallback: get any X account for this user
      const { data: anyAccount } = await supabase
        .from('x_accounts')
        .select('x_username, x_display_name, x_profile_image_url')
        .eq('user_id', user.id)
        .limit(1)
        .single();
      xAccount = anyAccount;
    }

    return jsonResponse({
      user: {
        id: user.id,
        email: profile?.email || user.email,
        name: profile?.display_name,
        avatar: profile?.avatar_url,
        xUsername: xAccount?.x_username || null,
        xDisplayName: xAccount?.x_display_name || null,
        xAvatar: xAccount?.x_profile_image_url || null
      },
      isPremium
    });

  } catch (error) {
    console.error('Extension user API error:', error);
    return jsonResponse(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
