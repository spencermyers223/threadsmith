'use client'

import { Link as LinkIcon } from 'lucide-react'
import { ProfileHeader } from './ProfileHeader'

interface MediaItem {
  url: string
  type: string
  filename: string
  size: number
  created_at: string
}

interface TweetPreviewProps {
  content: string
  media?: MediaItem[]
}

export function TweetPreview({ content, media }: TweetPreviewProps) {
  const plainText = stripHtml(content)
  const charCount = plainText.length
  const maxChars = 280

  const hasLink = /(https?:\/\/[^\s]+)/.test(plainText)

  const getCounterColor = () => {
    if (charCount > maxChars) return 'text-red-400'
    if (charCount >= 250) return 'text-sand'
    return 'text-green-400'
  }

  return (
    <div className="space-y-4">
      {/* Preview Card */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
        {/* Profile Section */}
        <ProfileHeader size="md" className="mb-3" />

        {/* Tweet Content */}
        <div className="pl-[52px]">
          <div className="whitespace-pre-wrap break-words text-[var(--foreground)]">
            {plainText || <span className="text-[var(--muted)]">Start typing...</span>}
          </div>

          {/* Media Grid */}
          {media && media.length > 0 && (
            <div className={`mt-3 grid gap-0.5 rounded-xl overflow-hidden border border-[var(--border)] ${
              media.length === 1 ? 'grid-cols-1' :
              media.length === 2 ? 'grid-cols-2' :
              media.length === 3 ? 'grid-cols-2' : 'grid-cols-2'
            }`}>
              {media.slice(0, 4).map((item, i) => (
                <div
                  key={item.filename}
                  className={`relative bg-[var(--card)] ${
                    media.length === 1 ? 'aspect-video' :
                    media.length === 3 && i === 0 ? 'row-span-2 aspect-auto h-full' :
                    'aspect-square'
                  }`}
                >
                  {item.type.startsWith('image/') ? (
                    <img
                      src={item.url}
                      alt={item.filename}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <video
                      src={item.url}
                      className="w-full h-full object-cover"
                      muted
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Character Count */}
        <div className="pl-[52px] mt-4 pt-3 border-t border-[var(--border)]">
          <span className={`text-sm font-mono ${getCounterColor()}`}>
            {charCount}/280
          </span>
        </div>
      </div>

      {/* Warnings */}
      {hasLink && (
        <div className="flex items-center gap-2 text-sand text-sm p-3 bg-sand/10 rounded-lg">
          <LinkIcon className="w-4 h-4" />
          <span>External link detected. Consider moving to a reply for better reach.</span>
        </div>
      )}

      {charCount > maxChars && (
        <div className="flex items-center gap-2 text-red-400 text-sm p-3 bg-red-400/10 rounded-lg">
          <span>Tweet exceeds 280 character limit by {charCount - maxChars} characters.</span>
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
