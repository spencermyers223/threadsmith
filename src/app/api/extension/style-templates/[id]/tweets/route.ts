import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/extension/style-templates/:id/tweets - Add tweet to template
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: templateId } = await params
    
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
    const { text, url, author_handle, author_name, author_avatar } = body

    if (!text) {
      return NextResponse.json({ error: 'Tweet text is required' }, { status: 400 })
    }

    // Get the template and verify ownership
    const { data: template, error: fetchError } = await supabase
      .from('style_templates')
      .select('id, user_id, tweets, content_type, admired_account_username')
      .eq('id', templateId)
      .single()

    if (fetchError || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    if (template.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Check tweet limit based on content type
    const currentTweets = template.tweets || []
    const maxTweets = template.content_type === 'tweet' ? 5 : 
                      template.content_type === 'thread' ? 15 : 0

    if (template.content_type === 'article') {
      return NextResponse.json({ 
        error: 'Article templates use style essence, not tweet examples' 
      }, { status: 400 })
    }

    if (currentTweets.length >= maxTweets) {
      return NextResponse.json({ 
        error: `Template already has maximum ${maxTweets} tweets` 
      }, { status: 400 })
    }

    // Check for duplicate (same text)
    const isDuplicate = currentTweets.some(
      (t: { text: string }) => t.text.toLowerCase().trim() === text.toLowerCase().trim()
    )
    if (isDuplicate) {
      return NextResponse.json({ 
        error: 'This tweet is already in the template' 
      }, { status: 409 })
    }

    // Add the new tweet
    const newTweet = {
      text,
      url: url || null,
      added_at: new Date().toISOString(),
      author_handle: author_handle || template.admired_account_username || null,
      author_name: author_name || null,
      author_avatar: author_avatar || null
    }

    const updatedTweets = [...currentTweets, newTweet]

    // Update the template
    const { error: updateError } = await supabase
      .from('style_templates')
      .update({ 
        tweets: updatedTweets,
        updated_at: new Date().toISOString()
      })
      .eq('id', templateId)

    if (updateError) {
      console.error('Error adding tweet to template:', updateError)
      return NextResponse.json({ error: 'Failed to add tweet' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Tweet added to template',
      tweetCount: updatedTweets.length,
      maxTweets
    })

  } catch (error) {
    console.error('Extension add-tweet error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/extension/style-templates/:id/tweets - Remove tweet from template
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: templateId } = await params
    
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
    const { tweetIndex } = body

    if (typeof tweetIndex !== 'number') {
      return NextResponse.json({ error: 'Tweet index is required' }, { status: 400 })
    }

    // Get the template and verify ownership
    const { data: template, error: fetchError } = await supabase
      .from('style_templates')
      .select('id, user_id, tweets')
      .eq('id', templateId)
      .single()

    if (fetchError || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    if (template.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const currentTweets = template.tweets || []
    if (tweetIndex < 0 || tweetIndex >= currentTweets.length) {
      return NextResponse.json({ error: 'Invalid tweet index' }, { status: 400 })
    }

    // Remove the tweet
    currentTweets.splice(tweetIndex, 1)

    // Update the template
    const { error: updateError } = await supabase
      .from('style_templates')
      .update({ 
        tweets: currentTweets,
        updated_at: new Date().toISOString()
      })
      .eq('id', templateId)

    if (updateError) {
      console.error('Error removing tweet from template:', updateError)
      return NextResponse.json({ error: 'Failed to remove tweet' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Tweet removed from template',
      tweetCount: currentTweets.length
    })

  } catch (error) {
    console.error('Extension remove-tweet error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
