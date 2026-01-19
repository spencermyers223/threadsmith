'use client'

import { Link as LinkIcon, AlertTriangle } from 'lucide-react'
import { ProfileHeader } from './ProfileHeader'

interface ArticlePreviewProps {
  content: string
  headline?: string
}

export function ArticlePreview({ content, headline }: ArticlePreviewProps) {
  const plainText = stripHtml(content)
  const wordCount = plainText.trim().split(/\s+/).filter(Boolean).length
  const charCount = plainText.length
  const readTime = Math.max(1, Math.ceil(wordCount / 200))

  const hasLink = /(https?:\/\/[^\s]+)/.test(plainText)

  const getWordCountWarning = () => {
    if (wordCount < 500) {
      return { type: 'warning', message: 'Article may be too short (aim for 1000-2000 words)' }
    }
    if (wordCount > 3000) {
      return { type: 'warning', message: 'Consider breaking into a thread' }
    }
    return null
  }

  const warning = getWordCountWarning()

  return (
    <div className="space-y-4">
      {/* Article Preview Card */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
        {/* Profile Section */}
        <div className="p-4 border-b border-[var(--border)]">
          <ProfileHeader size="lg" />
        </div>

        {/* Article Content */}
        <div className="p-4">
          {/* Headline */}
          <h1 className="text-xl font-bold text-[var(--foreground)] mb-4">
            {headline || <span className="text-[var(--muted)]">Your headline...</span>}
          </h1>

          {/* Body Preview */}
          <div className="prose prose-sm max-w-none text-[var(--foreground)]">
            {plainText ? (
              <div className="whitespace-pre-wrap break-words">
                {plainText.length > 500
                  ? plainText.slice(0, 500) + '...'
                  : plainText}
              </div>
            ) : (
              <p className="text-[var(--muted)]">Start writing your article...</p>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="px-4 py-3 border-t border-[var(--border)] bg-[var(--background)]">
          <div className="flex items-center gap-6 text-sm">
            <span className="text-[var(--muted)]">
              <span className="font-medium text-[var(--foreground)]">{wordCount}</span> words
            </span>
            <span className="text-[var(--muted)]">
              <span className="font-medium text-[var(--foreground)]">{charCount}</span> characters
            </span>
            <span className="text-[var(--muted)]">
              ~<span className="font-medium text-[var(--foreground)]">{readTime}</span> min read
            </span>
          </div>
        </div>
      </div>

      {/* Warnings */}
      {warning && (
        <div className="flex items-center gap-2 text-yellow-400 text-sm p-3 bg-yellow-400/10 rounded-lg">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{warning.message}</span>
        </div>
      )}

      {hasLink && (
        <div className="flex items-center gap-2 text-blue-400 text-sm p-3 bg-blue-400/10 rounded-lg">
          <LinkIcon className="w-4 h-4 flex-shrink-0" />
          <span>External links in articles are acceptable but may still affect reach.</span>
        </div>
      )}
    </div>
  )
}

function stripHtml(html: string): string {
  if (typeof document === 'undefined') return html.replace(/<[^>]*>/g, '')
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
}
