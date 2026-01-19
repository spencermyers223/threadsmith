'use client'

import { useRef, useEffect } from 'react'
import { Plus, X, GripVertical } from 'lucide-react'
import type { ThreadTweet } from '@/components/preview/ThreadPreview'

interface ThreadEditorProps {
  tweets: ThreadTweet[]
  onTweetsChange: (tweets: ThreadTweet[]) => void
}

export function ThreadEditor({ tweets, onTweetsChange }: ThreadEditorProps) {
  const textareaRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map())

  const handleTweetChange = (id: string, content: string) => {
    onTweetsChange(
      tweets.map(t => t.id === id ? { ...t, content } : t)
    )
  }

  const handleAddTweet = () => {
    const newId = String(Date.now())
    onTweetsChange([...tweets, { id: newId, content: '' }])
    // Focus the new textarea after render
    setTimeout(() => {
      const textarea = textareaRefs.current.get(newId)
      textarea?.focus()
    }, 0)
  }

  const handleDeleteTweet = (id: string) => {
    if (tweets.length <= 1) return
    onTweetsChange(tweets.filter(t => t.id !== id))
  }

  const handleKeyDown = (e: React.KeyboardEvent, id: string, index: number) => {
    // Cmd/Ctrl + Enter to add new tweet
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleAddTweet()
    }

    // Tab to go to next tweet (or add new if at last)
    if (e.key === 'Tab' && !e.shiftKey) {
      if (index === tweets.length - 1) {
        e.preventDefault()
        handleAddTweet()
      }
    }

    // Backspace on empty tweet to delete and focus previous
    if (e.key === 'Backspace' && tweets.length > 1) {
      const tweet = tweets.find(t => t.id === id)
      if (tweet?.content === '' && index > 0) {
        e.preventDefault()
        const prevTweet = tweets[index - 1]
        handleDeleteTweet(id)
        setTimeout(() => {
          const textarea = textareaRefs.current.get(prevTweet.id)
          textarea?.focus()
        }, 0)
      }
    }
  }

  // Auto-resize textarea
  const adjustHeight = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto'
    textarea.style.height = `${textarea.scrollHeight}px`
  }

  useEffect(() => {
    // Adjust all textareas on mount
    textareaRefs.current.forEach((textarea) => {
      adjustHeight(textarea)
    })
  }, [tweets])

  const getCharCountColor = (length: number) => {
    if (length > 280) return 'text-red-400'
    if (length >= 250) return 'text-yellow-400'
    return 'text-[var(--muted)]'
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-[var(--muted)] mb-4">
        Each text box is one tweet. Press <kbd className="px-1.5 py-0.5 bg-[var(--card)] rounded text-xs">Cmd+Enter</kbd> to add a new tweet.
      </div>

      {tweets.map((tweet, index) => (
        <div
          key={tweet.id}
          className="group relative bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-hidden hover:border-[var(--border-hover)] transition-colors"
        >
          {/* Tweet Number Badge */}
          <div className="absolute top-3 left-3 w-6 h-6 rounded-full bg-accent flex items-center justify-center">
            <span className="text-white text-xs font-bold">{index + 1}</span>
          </div>

          {/* Drag Handle (for future drag-drop) */}
          <div className="absolute top-3 right-10 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab text-[var(--muted)]">
            <GripVertical className="w-4 h-4" />
          </div>

          {/* Delete Button (not on first tweet) */}
          {index > 0 && (
            <button
              onClick={() => handleDeleteTweet(tweet.id)}
              className="absolute top-3 right-3 p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-[var(--muted)] hover:text-red-400 transition-all"
              title="Delete tweet"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Tweet Content */}
          <div className="pt-3 pb-2 px-4 pl-12">
            <textarea
              ref={(el) => {
                if (el) textareaRefs.current.set(tweet.id, el)
              }}
              value={tweet.content}
              onChange={(e) => {
                handleTweetChange(tweet.id, e.target.value)
                adjustHeight(e.target)
              }}
              onKeyDown={(e) => handleKeyDown(e, tweet.id, index)}
              placeholder={index === 0 ? "Start your thread with a hook..." : `Tweet ${index + 1}...`}
              className="w-full bg-transparent border-none focus:outline-none resize-none text-[var(--foreground)] placeholder:text-[var(--muted)] min-h-[60px]"
              rows={2}
            />
          </div>

          {/* Character Count */}
          <div className="px-4 pb-3 pl-12 flex items-center justify-between">
            <span className={`text-xs font-mono ${getCharCountColor(tweet.content.length)}`}>
              {tweet.content.length}/280
            </span>
            {tweet.content.length > 280 && (
              <span className="text-xs text-red-400">
                -{tweet.content.length - 280} characters
              </span>
            )}
          </div>
        </div>
      ))}

      {/* Add Tweet Button */}
      <button
        onClick={handleAddTweet}
        className="w-full p-3 flex items-center justify-center gap-2 text-sm text-[var(--muted)] hover:text-accent border border-dashed border-[var(--border)] hover:border-accent rounded-lg transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add Tweet
      </button>

      {/* Thread Summary */}
      <div className="text-sm text-[var(--muted)] pt-2">
        {tweets.length} {tweets.length === 1 ? 'tweet' : 'tweets'} in thread
        {tweets.some(t => t.content.length > 280) && (
          <span className="text-red-400 ml-2">• Some tweets exceed limit</span>
        )}
      </div>
    </div>
  )
}
