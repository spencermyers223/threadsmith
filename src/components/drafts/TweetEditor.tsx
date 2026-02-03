'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { ImageIcon, Smile, Loader2, X } from 'lucide-react'
import Image from 'next/image'
import EmojiPicker from 'emoji-picker-react'
import type { MediaItem } from '@/components/drafts/MediaUpload'

interface TweetEditorProps {
  content: string
  onChange: (content: string) => void
  postId?: string | null
  onSaveFirst?: () => Promise<string | null>
  media?: MediaItem[]
  onMediaChange?: (media: MediaItem[]) => void
}

export function TweetEditor({ 
  content, 
  onChange, 
  postId, 
  onSaveFirst,
  media = [],
  onMediaChange 
}: TweetEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Auto-resize textarea
  const adjustHeight = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto'
    textarea.style.height = `${textarea.scrollHeight}px`
  }

  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight(textareaRef.current)
    }
  }, [content])

  const getCharCountColor = (length: number) => {
    if (length > 280) return 'text-red-400'
    if (length >= 250) return 'text-sand'
    return 'text-[var(--muted)]'
  }

  // Get plain text length (strip HTML if any)
  const getPlainTextLength = (text: string) => {
    // Simple HTML stripping for character count
    return text
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .length
  }

  // Convert HTML to plain text for display
  const htmlToPlainText = (html: string) => {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>\s*<p>/gi, '\n\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<p>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim()
  }

  // Convert plain text to HTML for storage
  const plainTextToHtml = (text: string) => {
    return text
      .split(/\n\n+/)
      .map(para => `<p>${para.replace(/\n/g, '<br>')}</p>`)
      .join('')
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value
    onChange(plainTextToHtml(newText))
    adjustHeight(e.target)
  }

  // Handle media upload
  const handleMediaUpload = useCallback(async (file: File) => {
    if (!onMediaChange) return
    
    setUploadError(null)
    setUploading(true)

    try {
      const isImage = file.type.startsWith('image/')
      const isVideo = file.type.startsWith('video/')
      const isGif = file.type === 'image/gif'
      
      if (!isImage && !isVideo) {
        throw new Error('Only images and videos are supported')
      }

      const maxSize = isVideo ? 512 * 1024 * 1024 : 10 * 1024 * 1024
      if (file.size > maxSize) {
        throw new Error(`File too large. Max: ${isVideo ? '512MB' : '10MB'}`)
      }

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

      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`/api/posts/${targetPostId}/media`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Upload failed')
      }

      const mediaItem = await res.json()

      const newMedia: MediaItem = {
        url: mediaItem.url,
        type: isGif ? 'gif' : isVideo ? 'video' : 'image',
        filename: mediaItem.filename,
        size: mediaItem.size || file.size,
        created_at: mediaItem.created_at || new Date().toISOString()
      }

      onMediaChange([...media, newMedia])
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }, [postId, onSaveFirst, media, onMediaChange])

  // Handle media removal
  const handleRemoveMedia = (index: number) => {
    if (onMediaChange) {
      onMediaChange(media.filter((_, i) => i !== index))
    }
  }

  // Handle emoji selection
  const handleEmojiSelect = (emoji: string) => {
    const textarea = textareaRef.current
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const plainText = htmlToPlainText(content)
      const newText = plainText.substring(0, start) + emoji + plainText.substring(end)
      onChange(plainTextToHtml(newText))
      
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + emoji.length
        textarea.focus()
      }, 0)
    }
    setShowEmojiPicker(false)
  }

  const charCount = getPlainTextLength(content)
  const displayText = htmlToPlainText(content)

  return (
    <div className="space-y-3">
      <div className="text-sm text-[var(--muted)] mb-4">
        Craft your tweet. Keep it under 280 characters.
      </div>

      <div className="group relative bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-hidden hover:border-[var(--border-hover)] transition-colors">
        {/* Tweet Number Badge */}
        <div className="absolute top-3 left-3 w-6 h-6 rounded-full bg-accent flex items-center justify-center">
          <span className="text-white text-xs font-bold">1</span>
        </div>

        {/* Tweet Content */}
        <div className="pt-3 pb-2 px-4 pl-12">
          <textarea
            ref={textareaRef}
            value={displayText}
            onChange={handleTextChange}
            placeholder="What's happening?"
            className="w-full bg-transparent border-none focus:outline-none resize-none text-[var(--foreground)] placeholder:text-[var(--muted)] min-h-[100px]"
            rows={4}
          />
        </div>

        {/* Media Preview */}
        {media.length > 0 && (
          <div className="px-4 pl-12 pb-2">
            <div className="flex gap-2 flex-wrap">
              {media.map((m, idx) => (
                <div key={idx} className="relative group/media">
                  {m.type === 'video' ? (
                    <video 
                      src={m.url} 
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                  ) : (
                    <Image 
                      src={m.url} 
                      alt={m.filename || 'Media'}
                      width={96}
                      height={96}
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                  )}
                  <button
                    onClick={() => handleRemoveMedia(idx)}
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
            <span className={`text-xs font-mono ${getCharCountColor(charCount)}`}>
              {charCount}/280
            </span>
            {charCount > 280 && (
              <span className="text-xs text-red-400">
                -{charCount - 280} characters
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
              ref={fileInputRef}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleMediaUpload(file)
                e.target.value = ''
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || media.length >= 4}
              className="p-1.5 rounded-lg hover:bg-[var(--accent)]/10 text-[var(--muted)] hover:text-[var(--accent)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={media.length === 4 ? 'Max 4 media per tweet' : 'Add image or video'}
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ImageIcon className="w-4 h-4" />
              )}
            </button>

            {/* Emoji Picker Button */}
            <div className="relative">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-1.5 rounded-lg hover:bg-[var(--accent)]/10 text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
                title="Add emoji"
              >
                <Smile className="w-4 h-4" />
              </button>
              {showEmojiPicker && (
                <div className="absolute bottom-full right-0 mb-2 z-50">
                  <EmojiPicker
                    onEmojiClick={(emojiData) => handleEmojiSelect(emojiData.emoji)}
                    width={300}
                    height={400}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Upload Error */}
        {uploadError && (
          <div className="px-4 pb-2 pl-12">
            <p className="text-xs text-red-400">{uploadError}</p>
          </div>
        )}
      </div>
    </div>
  )
}
