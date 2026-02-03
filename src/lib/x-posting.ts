/**
 * X Posting Utilities
 * 
 * Handles posting tweets and threads to X via API
 */

export interface PostResult {
  success: boolean
  tweet_id?: string
  error?: string
}

export interface ThreadResult {
  success: boolean
  thread_length?: number
  tweets?: { id: string; text: string }[]
  first_tweet_id?: string
  error?: string
}

/**
 * Post a single tweet to X
 */
export async function postTweet(text: string): Promise<PostResult> {
  try {
    const res = await fetch('/api/x/post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })

    const data = await res.json()

    if (!res.ok) {
      return { success: false, error: data.error || 'Failed to post' }
    }

    return { success: true, tweet_id: data.tweet_id }
  } catch (err) {
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Network error' 
    }
  }
}

/**
 * Post a thread (multiple tweets) to X
 */
export async function postThread(tweets: string[]): Promise<ThreadResult> {
  try {
    const res = await fetch('/api/x/thread', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tweets }),
    })

    const data = await res.json()

    if (!res.ok) {
      return { success: false, error: data.error || 'Failed to post thread' }
    }

    return {
      success: true,
      thread_length: data.thread_length,
      tweets: data.tweets,
      first_tweet_id: data.first_tweet_id,
    }
  } catch (err) {
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Network error' 
    }
  }
}

/**
 * Fallback to X intent URL (for users without X connection)
 * Note: X intent doesn't support media, user must add manually
 */
export function openXIntent(text: string, options?: { hasMedia?: boolean }) {
  const url = `https://x.com/intent/post?text=${encodeURIComponent(text)}`
  window.open(url, '_blank', 'width=550,height=420')
  
  // Return info for caller to show media reminder if needed
  return { hasMedia: options?.hasMedia }
}

/**
 * Copy thread tweets to clipboard for manual posting
 */
export async function copyThreadToClipboard(tweets: string[]): Promise<boolean> {
  try {
    const text = tweets.map((t, i) => `${i + 1}/${tweets.length}\n${t}`).join('\n\n---\n\n')
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/**
 * Open a posted tweet in X
 */
export function openTweet(tweetId: string, username?: string) {
  const url = username 
    ? `https://x.com/${username}/status/${tweetId}`
    : `https://x.com/i/status/${tweetId}`
  window.open(url, '_blank')
}
