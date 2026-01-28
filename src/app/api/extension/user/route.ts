import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify the token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
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

    return NextResponse.json({
      user: {
        id: user.id,
        email: profile?.email || user.email,
        name: profile?.display_name,
        avatar: profile?.avatar_url
      },
      isPremium
    });

  } catch (error) {
    console.error('Extension user API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
