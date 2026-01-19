'use client'

import { Link as LinkIcon } from 'lucide-react'

interface ArticlePreviewProps {
  content: string
}

export function ArticlePreview({ content }: ArticlePreviewProps) {
  const plainText = stripHtml(content)
  const wordCount = plainText.trim().split(/\s+/).filter(Boolean).length
  const charCount = plainText.length

  const hasLink = /(https?:\/\/[^\s]+)/.test(plainText)

  // Optimal article length is 1000-2000 words
  const getWordCountStatus = () => {
    if (wordCount < 500) return { color: 'text-yellow-400', message: 'Article may be too short (aim for 1000-2000 words)' }
    if (wordCount < 1000) return { color: 'text-yellow-400', message: 'Consider adding more depth (optimal: 1000-2000 words)' }
    if (wordCount <= 2000) return { color: 'text-green-400', message: 'Optimal length' }
    if (wordCount <= 3000) return { color: 'text-yellow-400', message: 'Article is getting long - consider splitting' }
    return { color: 'text-red-400', message: 'Article may be too long for engagement' }
  }

  const wordStatus = getWordCountStatus()

  return (
    <div className="space-y-4">
      {/* Article Preview */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
        {/* Article Header */}
        <div className="p-6 border-b border-[var(--border)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-accent" />
            <div>
              <div className="font-bold">Your Name</div>
              <div className="text-sm text-[var(--muted)]">@yourhandle</div>
            </div>
          </div>
        </div>

        {/* Article Content */}
        <div className="p-6">
          <div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: content || '<p class="text-[var(--muted)]">Start writing your article...</p>' }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <span className="text-[var(--muted)]">
            {wordCount} words
          </span>
          <span className="text-[var(--muted)]">
            {charCount} characters
          </span>
          <span className="text-[var(--muted)]">
            ~{Math.ceil(wordCount / 200)} min read
          </span>
        </div>
        <span className={wordStatus.color}>{wordStatus.message}</span>
      </div>

      {/* Warnings */}
      {hasLink && (
        <div className="flex items-center gap-2 text-blue-400 text-sm p-3 bg-blue-400/10 rounded-lg">
          <LinkIcon className="w-4 h-4" />
          <span>External links in articles are acceptable but may still affect reach.</span>
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
