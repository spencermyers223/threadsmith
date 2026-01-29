import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GET /api/inspiration-tweets/[id] - Get a specific inspiration tweet
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

    const { data: tweet, error } = await supabase
      .from('inspiration_tweets')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !tweet) {
      return NextResponse.json({ error: 'Tweet not found' }, { status: 404 });
    }

    return NextResponse.json(tweet);
  } catch (error) {
    console.error('Error fetching inspiration tweet:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inspiration tweet' },
      { status: 500 }
    );
  }
}

// PATCH /api/inspiration-tweets/[id] - Update notes on an inspiration tweet
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
    const { notes } = body;

    const { data: tweet, error } = await supabase
      .from('inspiration_tweets')
      .update({ notes })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error || !tweet) {
      return NextResponse.json({ error: 'Tweet not found' }, { status: 404 });
    }

    return NextResponse.json(tweet);
  } catch (error) {
    console.error('Error updating inspiration tweet:', error);
    return NextResponse.json(
      { error: 'Failed to update inspiration tweet' },
      { status: 500 }
    );
  }
}

// DELETE /api/inspiration-tweets/[id] - Remove a saved inspiration tweet
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

    const { error } = await supabase
      .from('inspiration_tweets')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting inspiration tweet:', error);
    return NextResponse.json(
      { error: 'Failed to delete inspiration tweet' },
      { status: 500 }
    );
  }
}
