'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { Plus, X, GripVertical, ImageIcon, Smile, Loader2 } from 'lucide-react'
import Image from 'next/image'
import type { ThreadTweet, TweetMedia } from '@/components/preview/ThreadPreview'
import EmojiPicker from 'emoji-picker-react'

interface ThreadEditorProps {
  tweets: ThreadTweet[]
  onTweetsChange: (tweets: ThreadTweet[]) => void
  postId?: string | null
  onSaveFirst?: () => Promise<string | null>
}

export function ThreadEditor({ tweets, onTweetsChange, postId, onSaveFirst }: ThreadEditorProps) {
  const textareaRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map())
  const fileInputRefs = useRef<Map<string, HTMLInputElement>>(new Map())
  const [uploadingTweetId, setUploadingTweetId] = useState<string | null>(null)
  const [emojiPickerTweetId, setEmojiPickerTweetId] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

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
    if (length >= 250) return 'text-sand'
    return 'text-[var(--muted)]'
  }

  // Handle media upload for a specific tweet
  const handleMediaUpload = useCallback(async (tweetId: string, file: File) => {
    setUploadError(null)
    setUploadingTweetId(tweetId)

    try {
      // Check file type
      const isImage = file.type.startsWith('image/')
      const isVideo = file.type.startsWith('video/')
      const isGif = file.type === 'image/gif'
      
      if (!isImage && !isVideo) {
        throw new Error('Only images and videos are supported')
      }

      // Check file size (10MB for images, 512MB for video)
      const maxSize = isVideo ? 512 * 1024 * 1024 : 10 * 1024 * 1024
      if (file.size > maxSize) {
        throw new Error(`File too large. Max: ${isVideo ? '512MB' : '10MB'}`)
      }

      // Get or create post ID
      let targetPostId = postId
      if (!targetPostId && onSaveFirst) {
        targetPostId = await onSaveFirst()
        if (!targetPostId) {
          throw new Error('Please save the draft first')
        }
      }

      if (!targetPostId) {
        throw new Error('Please save the draft first')
      }

      // Upload to server
      const formData = new FormData()
      formData.append('file', file)
      formData.append('tweetId', tweetId)

      const res = await fetch(`/api/posts/${targetPostId}/media`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Upload failed')
      }

      const mediaItem = await res.json()

      // Update the tweet with the new media
      const newMedia: TweetMedia = {
        url: mediaItem.url,
        type: isGif ? 'gif' : isVideo ? 'video' : 'image',
        filename: mediaItem.filename
      }

      onTweetsChange(
        tweets.map(t => t.id === tweetId 
          ? { ...t, media: [...(t.media || []), newMedia] }
          : t
        )
      )
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploadingTweetId(null)
    }
  }, [postId, onSaveFirst, tweets, onTweetsChange])

  // Handle media removal
  const handleRemoveMedia = (tweetId: string, mediaIndex: number) => {
    onTweetsChange(
      tweets.map(t => t.id === tweetId 
        ? { ...t, media: t.media?.filter((_, i) => i !== mediaIndex) }
        : t
      )
    )
  }

  // Handle emoji selection
  const handleEmojiSelect = (tweetId: string, emoji: string) => {
    const textarea = textareaRefs.current.get(tweetId)
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const currentTweet = tweets.find(t => t.id === tweetId)
      if (currentTweet) {
        const newContent = currentTweet.content.substring(0, start) + emoji + currentTweet.content.substring(end)
        onTweetsChange(
          tweets.map(t => t.id === tweetId ? { ...t, content: newContent } : t)
        )
        // Reset cursor position after emoji
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + emoji.length
          textarea.focus()
        }, 0)
      }
    }
    setEmojiPickerTweetId(null)
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

          {/* Media Preview */}
          {tweet.media && tweet.media.length > 0 && (
            <div className="px-4 pl-12 pb-2">
              <div className="flex gap-2 flex-wrap">
                {tweet.media.map((m, mIdx) => (
                  <div key={mIdx} className="relative group/media">
                    {m.type === 'video' ? (
                      <video 
                        src={m.url} 
                        className="w-24 h-24 object-cover rounded-lg"
                      />
                    ) : (
                      <Image 
                        src={m.url} 
                        alt={m.filename}
                        width={96}
                        height={96}
                        className="w-24 h-24 object-cover rounded-lg"
                      />
                    )}
                    <button
                      onClick={() => handleRemoveMedia(tweet.id, mIdx)}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full opacity-0 group-hover/media:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer: Char Count + Media/Emoji Buttons */}
          <div className="px-4 pb-3 pl-12 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-mono ${getCharCountColor(tweet.content.length)}`}>
                {tweet.content.length}/280
              </span>
              {tweet.content.length > 280 && (
                <span className="text-xs text-red-400">
                  -{tweet.content.length - 280} characters
                </span>
              )}
            </div>

            {/* Media + Emoji Buttons */}
            <div className="flex items-center gap-1">
              {/* Media Upload Button */}
              <input
                type="file"
                accept="image/*,video/*"
                className="hidden"
                ref={(el) => {
                  if (el) fileInputRefs.current.set(tweet.id, el)
                }}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleMediaUpload(tweet.id, file)
                  e.target.value = ''
                }}
              />
              <button
                onClick={() => fileInputRefs.current.get(tweet.id)?.click()}
                disabled={uploadingTweetId === tweet.id || (tweet.media?.length || 0) >= 4}
                className="p-1.5 rounded-lg hover:bg-[var(--accent)]/10 text-[var(--muted)] hover:text-[var(--accent)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={tweet.media?.length === 4 ? 'Max 4 media per tweet' : 'Add image or video'}
              >
                {uploadingTweetId === tweet.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ImageIcon className="w-4 h-4" />
                )}
              </button>

              {/* Emoji Picker Button */}
              <div className="relative">
                <button
                  onClick={() => setEmojiPickerTweetId(emojiPickerTweetId === tweet.id ? null : tweet.id)}
                  className="p-1.5 rounded-lg hover:bg-[var(--accent)]/10 text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
                  title="Add emoji"
                >
                  <Smile className="w-4 h-4" />
                </button>
                {emojiPickerTweetId === tweet.id && (
                  <div className="absolute bottom-full right-0 mb-2 z-50">
                    <EmojiPicker
                      onEmojiClick={(emojiData) => handleEmojiSelect(tweet.id, emojiData.emoji)}
                      width={300}
                      height={400}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Upload Error */}
          {uploadError && uploadingTweetId === tweet.id && (
            <div className="px-4 pb-2 pl-12">
              <p className="text-xs text-red-400">{uploadError}</p>
            </div>
          )}
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
