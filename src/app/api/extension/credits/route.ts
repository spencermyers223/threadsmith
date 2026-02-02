/**
 * Extension API - Get User Credits
 * 
 * GET /api/extension/credits
 * 
 * Returns user's current credit balance and usage summary.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUsageSummary, CREDIT_COSTS } from '@/lib/credits';

// CORS headers for extension requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

function jsonResponse(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Verify auth
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Missing authorization' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return jsonResponse({ error: 'Invalid token' }, 401);
    }

    // Get usage summary
    const usage = await getUsageSummary(supabase, user.id);

    if (!usage.success) {
      return jsonResponse({ error: usage.error }, 500);
    }

    return jsonResponse({
      credits: usage.credits,
      postsUsed: usage.postsUsed,
      postsLimit: usage.postsLimit,
      tier: usage.tier,
      // Include credit costs for UI display
      costs: {
        accountAnalysis: CREDIT_COSTS.ACCOUNT_ANALYSIS,
        replyCoaching: CREDIT_COSTS.REPLY_COACHING,
        voiceAdd: CREDIT_COSTS.VOICE_ADD,
      },
    });
  } catch (error) {
    console.error('[credits API] Error:', error);
    return jsonResponse({ error: 'Failed to fetch credits' }, 500);
  }
}
