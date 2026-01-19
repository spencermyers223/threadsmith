'use client'

import { Link as LinkIcon } from 'lucide-react'

interface TweetPreviewProps {
  content: string
}

export function TweetPreview({ content }: TweetPreviewProps) {
  const plainText = stripHtml(content)
  const charCount = plainText.length
  const maxChars = 280 // Standard tweet limit
  const longFormMax = 4000

  const hasLink = /(https?:\/\/[^\s]+)/.test(plainText)
  const percentUsed = (charCount / maxChars) * 100

  const getCounterColor = () => {
    if (charCount > maxChars) return 'text-red-400'
    if (charCount > maxChars * 0.9) return 'text-yellow-400'
    return 'text-green-400'
  }

  return (
    <div className="space-y-4">
      {/* Preview Card */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-accent flex-shrink-0" />

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold">Your Name</span>
              <span className="text-[var(--muted)]">@yourhandle</span>
            </div>
            <div className="whitespace-pre-wrap break-words">
              {plainText || <span className="text-[var(--muted)]">Start typing...</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Character Count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative w-8 h-8">
            <svg className="w-full h-full -rotate-90">
              <circle
                cx="16"
                cy="16"
                r="14"
                fill="none"
                stroke="var(--border)"
                strokeWidth="2"
              />
              <circle
                cx="16"
                cy="16"
                r="14"
                fill="none"
                stroke={charCount > maxChars ? '#f87171' : charCount > maxChars * 0.9 ? '#fbbf24' : '#4ade80'}
                strokeWidth="2"
                strokeDasharray={`${Math.min(percentUsed, 100) * 0.88} 88`}
              />
            </svg>
          </div>
          <span className={`text-sm font-mono ${getCounterColor()}`}>
            {charCount}/{maxChars}
          </span>
        </div>

        {charCount > maxChars && charCount <= longFormMax && (
          <span className="text-sm text-yellow-400">
            Long-form tweet ({charCount}/{longFormMax})
          </span>
        )}
        {charCount > longFormMax && (
          <span className="text-sm text-red-400">
            Exceeds limit!
          </span>
        )}
      </div>

      {/* Warnings */}
      {hasLink && (
        <div className="flex items-center gap-2 text-yellow-400 text-sm p-3 bg-yellow-400/10 rounded-lg">
          <LinkIcon className="w-4 h-4" />
          <span>External link detected. Consider moving to a reply for better reach.</span>
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
