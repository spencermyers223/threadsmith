import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/inspiration - Save a tweet to inspiration library
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const supabase = await createClient()

    // Verify token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const {
      tweet_text,
      tweet_url,
      author_handle,
      author_name,
      author_avatar,
      engagement_metrics,
      source = 'extension',
      notes
    } = body

    if (!tweet_text) {
      return NextResponse.json({ error: 'Tweet text is required' }, { status: 400 })
    }

    // Extract tweet_id from URL if possible
    // URL format: https://x.com/username/status/1234567890
    let tweet_id = 'ext_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    let extracted_author_handle = author_handle

    if (tweet_url) {
      const urlMatch = tweet_url.match(/(?:twitter\.com|x\.com)\/([^\/]+)\/status\/(\d+)/)
      if (urlMatch) {
        extracted_author_handle = extracted_author_handle || urlMatch[1]
        tweet_id = urlMatch[2]
      }
    }

    // Parse engagement metrics if provided as string
    let reply_count = 0
    let like_count = 0
    let repost_count = 0
    let quote_count = 0

    if (engagement_metrics) {
      if (typeof engagement_metrics === 'string') {
        // Parse format like "123 💬  456 🔄  789 ❤️"
        const replyMatch = engagement_metrics.match(/(\d+(?:,\d+)*(?:\.\d+)?[KMB]?)\s*(?:💬|replies)/i)
        const retweetMatch = engagement_metrics.match(/(\d+(?:,\d+)*(?:\.\d+)?[KMB]?)\s*(?:🔄|retweets|reposts)/i)
        const likeMatch = engagement_metrics.match(/(\d+(?:,\d+)*(?:\.\d+)?[KMB]?)\s*(?:❤️|likes)/i)

        reply_count = parseMetricNumber(replyMatch?.[1])
        repost_count = parseMetricNumber(retweetMatch?.[1])
        like_count = parseMetricNumber(likeMatch?.[1])
      } else if (typeof engagement_metrics === 'object') {
        reply_count = engagement_metrics.replies || engagement_metrics.reply_count || 0
        like_count = engagement_metrics.likes || engagement_metrics.like_count || 0
        repost_count = engagement_metrics.retweets || engagement_metrics.repost_count || 0
        quote_count = engagement_metrics.quotes || engagement_metrics.quote_count || 0
      }
    }

    // Get user's default x_account (optional)
    const { data: xAccount } = await supabase
      .from('x_accounts')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    // Insert the inspiration tweet
    const { data: tweet, error: insertError } = await supabase
      .from('inspiration_tweets')
      .upsert({
        user_id: user.id,
        x_account_id: xAccount?.id || null,
        tweet_id,
        tweet_text,
        tweet_url: tweet_url || null,
        author_id: extracted_author_handle || 'unknown',
        author_username: extracted_author_handle || 'unknown',
        author_name: author_name || extracted_author_handle || null,
        author_profile_image_url: author_avatar || null,
        reply_count,
        like_count,
        repost_count,
        quote_count,
        notes: notes || (source === 'extension' ? 'Saved from browser extension' : null)
      }, {
        onConflict: 'user_id,x_account_id,tweet_id',
        ignoreDuplicates: false
      })
      .select()
      .single()

    if (insertError) {
      // Check if it's a duplicate error
      if (insertError.code === '23505') {
        return NextResponse.json({ 
          success: true, 
          message: 'Already saved',
          duplicate: true 
        })
      }
      console.error('Error saving inspiration tweet:', insertError)
      return NextResponse.json({ error: 'Failed to save tweet' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Saved to inspiration!',
      tweet
    })

  } catch (error) {
    console.error('Inspiration API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/inspiration - List user's inspiration tweets
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.split(' ')[1]
    const supabase = await createClient()

    // Verify token and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const author = searchParams.get('author')

    let query = supabase
      .from('inspiration_tweets')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('saved_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (author) {
      query = query.ilike('author_username', `%${author}%`)
    }

    const { data: tweets, count, error } = await query

    if (error) {
      console.error('Error fetching inspiration tweets:', error)
      return NextResponse.json({ error: 'Failed to fetch tweets' }, { status: 500 })
    }

    return NextResponse.json({
      tweets: tweets || [],
      total: count || 0,
      limit,
      offset
    })

  } catch (error) {
    console.error('Inspiration API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper to parse metric numbers like "1.2K" or "3M"
function parseMetricNumber(str: string | undefined | null): number {
  if (!str) return 0
  const cleaned = str.replace(/,/g, '')
  const match = cleaned.match(/^(\d+(?:\.\d+)?)([KMB])?$/i)
  if (!match) return parseInt(cleaned) || 0
  
  const num = parseFloat(match[1])
  const suffix = match[2]?.toUpperCase()
  
  if (suffix === 'K') return Math.round(num * 1000)
  if (suffix === 'M') return Math.round(num * 1000000)
  if (suffix === 'B') return Math.round(num * 1000000000)
  return Math.round(num)
}
