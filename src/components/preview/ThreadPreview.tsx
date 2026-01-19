'use client'

import { AlertCircle, ImageIcon, Link as LinkIcon } from 'lucide-react'

interface ThreadPreviewProps {
  content: string
}

export function ThreadPreview({ content }: ThreadPreviewProps) {
  const plainText = stripHtml(content)

  // Split content into tweets by double newlines or numbered patterns
  const tweets = parseThreadTweets(plainText)
  const maxChars = 280

  const hasLink = /(https?:\/\/[^\s]+)/.test(plainText)

  return (
    <div className="space-y-4">
      {/* Thread Preview */}
      <div className="space-y-0">
        {tweets.length === 0 ? (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
            <p className="text-[var(--muted)] text-center">
              Start typing your thread...
            </p>
          </div>
        ) : (
          tweets.map((tweet, index) => (
            <div
              key={index}
              className="bg-[var(--card)] border border-[var(--border)] first:rounded-t-xl last:rounded-b-xl -mt-px p-4"
            >
              <div className="flex items-start gap-3">
                {/* Thread Line */}
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-accent flex-shrink-0 flex items-center justify-center text-white font-bold">
                    {index + 1}
                  </div>
                  {index < tweets.length - 1 && (
                    <div className="w-0.5 flex-1 bg-[var(--border)] mt-2" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold">Your Name</span>
                    <span className="text-[var(--muted)]">@yourhandle</span>
                  </div>
                  <div className="whitespace-pre-wrap break-words mb-2">
                    {tweet.text}
                  </div>

                  {/* Character count */}
                  <div className="flex items-center justify-between text-sm">
                    <span
                      className={`font-mono ${
                        tweet.text.length > maxChars
                          ? 'text-red-400'
                          : tweet.text.length > maxChars * 0.9
                          ? 'text-yellow-400'
                          : 'text-[var(--muted)]'
                      }`}
                    >
                      {tweet.text.length}/{maxChars}
                    </span>

                    {/* Image placement suggestion */}
                    {(index + 1) % 4 === 0 && index < tweets.length - 1 && (
                      <span className="flex items-center gap-1 text-accent text-xs">
                        <ImageIcon className="w-3 h-3" aria-hidden="true" />
                        Consider adding an image here
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Thread Stats */}
      {tweets.length > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--muted)]">
            {tweets.length} tweets in thread
          </span>
          {tweets.length < 5 && (
            <span className="text-yellow-400">
              Consider adding more value (optimal: 5-15 tweets)
            </span>
          )}
          {tweets.length > 15 && (
            <span className="text-yellow-400">
              Thread may be too long (optimal: 5-15 tweets)
            </span>
          )}
        </div>
      )}

      {/* Warnings */}
      {hasLink && (
        <div className="flex items-center gap-2 text-yellow-400 text-sm p-3 bg-yellow-400/10 rounded-lg">
          <LinkIcon className="w-4 h-4" />
          <span>External link detected. Consider moving to a reply for better reach.</span>
        </div>
      )}

      {/* Over limit warnings */}
      {tweets.some(t => t.text.length > maxChars) && (
        <div className="flex items-center gap-2 text-red-400 text-sm p-3 bg-red-400/10 rounded-lg">
          <AlertCircle className="w-4 h-4" />
          <span>Some tweets exceed the 280 character limit. Please shorten them.</span>
        </div>
      )}
    </div>
  )
}

function stripHtml(html: string): string {
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
}

function parseThreadTweets(text: string): { text: string }[] {
  if (!text.trim()) return []

  // Try to split by numbered patterns (1/, 2/, etc. or 1. 2. etc.)
  const numberedPattern = /(?:^|\n)(?:\d+[.\/]\s*)/g
  const parts = text.split(numberedPattern).filter(Boolean)

  if (parts.length > 1) {
    return parts.map(p => ({ text: p.trim() }))
  }

  // Fall back to splitting by double newlines
  const paragraphs = text.split(/\n\n+/).filter(Boolean)

  if (paragraphs.length > 1) {
    return paragraphs.map(p => ({ text: p.trim() }))
  }

  // If still single block, return as one tweet
  return [{ text: text.trim() }]
}
