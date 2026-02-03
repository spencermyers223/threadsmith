'use client'

import { Plus, X, AlertCircle, Link as LinkIcon, ImageIcon } from 'lucide-react'

export interface TweetMedia {
  url: string
  type: 'image' | 'video' | 'gif'
  filename: string
}

export interface ThreadTweet {
  id: string
  content: string
  media?: TweetMedia[]
}

interface ThreadPreviewProps {
  tweets: ThreadTweet[]
  onAddTweet?: () => void
  onDeleteTweet?: (id: string) => void
  userName?: string
  userHandle?: string
}

export function ThreadPreview({ tweets, onAddTweet, onDeleteTweet, userName = 'Your Name', userHandle = 'yourhandle' }: ThreadPreviewProps) {
  const maxChars = 280
  const hasOverLimit = tweets.some(t => t.content.length > maxChars)
  const hasLink = tweets.some(t => /(https?:\/\/[^\s]+)/.test(t.content))

  const getCounterColor = (length: number) => {
    if (length > maxChars) return 'text-red-400'
    if (length >= 250) return 'text-sand'
    return 'text-green-400'
  }

  return (
    <div className="space-y-4">
      {/* Thread Preview Card */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
        {tweets.length === 0 ? (
          <div className="p-6 text-center text-[var(--muted)]">
            Start typing your thread...
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {tweets.map((tweet, index) => (
              <div key={tweet.id} className="p-4 relative group">
                <div className="flex gap-3">
                  {/* Avatar and Thread Connector */}
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                      <span className="text-white font-bold text-sm">{index + 1}</span>
                    </div>
                    {index < tweets.length - 1 && (
                      <div className="w-0.5 flex-1 bg-accent/30 mt-2 min-h-[20px]" />
                    )}
                  </div>

                  {/* Tweet Content */}
                  <div className="flex-1 min-w-0">
                    {/* Profile info on first tweet only */}
                    {index === 0 && (
                      <div className="mb-2">
                        <div className="font-bold text-[var(--foreground)]">{userName}</div>
                        <div className="text-sm text-[var(--muted)]">@{userHandle.replace('@', '')}</div>
                      </div>
                    )}

                    {/* Tweet number for subsequent tweets */}
                    {index > 0 && (
                      <div className="text-xs text-[var(--muted)] mb-1">{index + 1}/</div>
                    )}

                    {/* Tweet Text */}
                    <div className="whitespace-pre-wrap break-words text-[var(--foreground)] min-h-[24px]">
                      {tweet.content || <span className="text-[var(--muted)]">Tweet {index + 1}...</span>}
                    </div>

                    {/* Tweet Footer */}
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-[var(--border)]/50">
                      <span className={`text-sm font-mono ${getCounterColor(tweet.content.length)}`}>
                        {tweet.content.length}/280
                      </span>

                      {/* Image suggestion every 3-4 tweets */}
                      {(index + 1) % 4 === 0 && index < tweets.length - 1 && (
                        <span className="flex items-center gap-1 text-accent text-xs">
                          <ImageIcon className="w-3 h-3" />
                          Add image here
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Delete button (not on first tweet) */}
                  {index > 0 && onDeleteTweet && (
                    <button
                      onClick={() => onDeleteTweet(tweet.id)}
                      className="absolute top-2 right-2 p-1.5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-[var(--muted)] hover:text-red-400 transition-all"
                      title="Delete tweet"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Tweet Button */}
        {onAddTweet && (
          <button
            onClick={onAddTweet}
            className="w-full p-3 flex items-center justify-center gap-2 text-sm text-[var(--muted)] hover:text-accent hover:bg-[var(--card-hover)] transition-colors border-t border-[var(--border)]"
          >
            <Plus className="w-4 h-4" />
            Add Tweet
          </button>
        )}
      </div>

      {/* Thread Stats */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--muted)]">
          {tweets.length} {tweets.length === 1 ? 'tweet' : 'tweets'} in thread
        </span>
        {tweets.length > 0 && tweets.length < 5 && (
          <span className="text-sand">
            Consider adding more value (optimal: 5-15 tweets)
          </span>
        )}
        {tweets.length > 15 && (
          <span className="text-sand">
            Thread may be too long (optimal: 5-15 tweets)
          </span>
        )}
      </div>

      {/* Warnings */}
      {hasLink && (
        <div className="flex items-center gap-2 text-sand text-sm p-3 bg-sand/10 rounded-lg">
          <LinkIcon className="w-4 h-4" />
          <span>External link detected. Consider moving to a reply for better reach.</span>
        </div>
      )}

      {hasOverLimit && (
        <div className="flex items-center gap-2 text-red-400 text-sm p-3 bg-red-400/10 rounded-lg">
          <AlertCircle className="w-4 h-4" />
          <span>Some tweets exceed the 280 character limit. Please shorten them.</span>
        </div>
      )}
    </div>
  )
}

// Legacy support: Convert HTML content to tweets array
export function parseThreadFromContent(content: string): ThreadTweet[] {
  let plainText = stripHtml(content)
  if (!plainText.trim()) return [{ id: '1', content: '' }]
  
  // Clean formatting artifacts first
  plainText = plainText
    .replace(/^---+\s*/gm, '') // Remove --- delimiters
    .replace(/^\*\*[^*]+\*\*\s*/gm, '') // Remove **Option X** headers
    .replace(/\*Why this works:[\s\S]*?(?=\d+\/|$)/gi, '') // Remove analysis
    .replace(/\*Character count:.*$/gm, '') // Remove character count lines
    .replace(/\[\d+\s*chars?\]/gi, '') // Remove inline char counts
    .trim()

  // Try to split by numbered patterns (1/, 2/, etc.)
  const numberedPattern = /(?:^|\n)(\d+\/\d*)\s*/g
  const matches = Array.from(plainText.matchAll(numberedPattern))

  if (matches.length > 0) {
    const tweets: ThreadTweet[] = []
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i]
      const startPos = match.index! + match[0].length
      const endPos = matches[i + 1]?.index ?? plainText.length
      const tweetContent = plainText.slice(startPos, endPos)
        .split('\n')[0] // Take only first line
        .trim()
      
      if (tweetContent) {
        tweets.push({
          id: String(i + 1),
          content: tweetContent
        })
      }
    }
    if (tweets.length > 0) return tweets
  }

  // Fall back to splitting by double newlines
  const paragraphs = plainText
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0 && !p.startsWith('*') && !p.startsWith('---'))

  if (paragraphs.length > 1) {
    return paragraphs.map((p, i) => ({ id: String(i + 1), content: p }))
  }

  // If still single block, return as one tweet
  return [{ id: '1', content: plainText.trim() }]
}

function stripHtml(html: string): string {
  if (typeof document === 'undefined') return html.replace(/<[^>]*>/g, '')
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
}
