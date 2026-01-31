import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// CORS headers for extension requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// Helper to add CORS headers to responses
function jsonResponse(data: unknown, options: { status?: number; headers?: Record<string, string> } = {}) {
  return jsonResponse(data, { 
    status: options.status || 200,
    headers: corsHeaders 
  });
}

// Extension endpoint for fetching DM templates
// Uses token-based auth from extension

export async function GET(request: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');

    // Create Supabase client with user's token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    // Get user from token
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ error: 'Invalid token' }, { status: 401 });
    }

    // Fetch user's DM templates
    const { data: templates, error } = await supabase
      .from('dm_templates')
      .select('*')
      .eq('user_id', user.id)
      .order('position', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching DM templates:', error);
      return jsonResponse({ error: 'Failed to fetch templates' }, { status: 500 });
    }

    return jsonResponse({
      templates: templates || [],
    });
  } catch (error) {
    console.error('Extension DM templates error:', error);
    return jsonResponse(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Increment usage counter when template is used
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const body = await request.json();
    const { template_id } = body;

    if (!template_id) {
      return jsonResponse({ error: 'template_id required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ error: 'Invalid token' }, { status: 401 });
    }

    // Get current count
    const { data: current } = await supabase
      .from('dm_templates')
      .select('times_used')
      .eq('id', template_id)
      .eq('user_id', user.id)
      .single();

    if (current) {
      // Increment usage
      await supabase
        .from('dm_templates')
        .update({ times_used: (current.times_used || 0) + 1 })
        .eq('id', template_id)
        .eq('user_id', user.id);
    }

    return jsonResponse({ success: true });
  } catch (error) {
    console.error('Extension DM template usage error:', error);
    return jsonResponse(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
