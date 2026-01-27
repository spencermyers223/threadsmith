'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, X, Image as ImageIcon, Film, Loader2 } from 'lucide-react'

export interface MediaItem {
  url: string
  type: string
  filename: string
  size: number
  created_at: string
}

interface MediaUploadProps {
  postId: string | null
  media: MediaItem[]
  onMediaChange: (media: MediaItem[]) => void
  onSaveFirst?: () => Promise<string | null> // Returns postId after saving
}

export function MediaUpload({ postId, media, onMediaChange, onSaveFirst }: MediaUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const uploadFile = useCallback(async (file: File, targetPostId: string) => {
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

    return (await res.json()) as MediaItem
  }, [])

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    setError(null)
    setUploading(true)

    try {
      let targetId = postId
      if (!targetId && onSaveFirst) {
        targetId = await onSaveFirst()
        if (!targetId) {
          setError('Please save the draft first')
          setUploading(false)
          return
        }
      }

      if (!targetId) {
        setError('Please save the draft first')
        setUploading(false)
        return
      }

      const newMedia = [...media]
      for (const file of Array.from(files)) {
        try {
          const item = await uploadFile(file, targetId)
          // Replace existing with same filename or add new
          const idx = newMedia.findIndex(m => m.filename === item.filename)
          if (idx >= 0) {
            newMedia[idx] = item
          } else {
            newMedia.push(item)
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Upload failed')
        }
      }
      onMediaChange(newMedia)
    } finally {
      setUploading(false)
    }
  }, [postId, media, onMediaChange, onSaveFirst, uploadFile])

  const handleRemove = useCallback(async (item: MediaItem) => {
    if (!postId) return

    try {
      const res = await fetch(`/api/posts/${postId}/media/${encodeURIComponent(item.filename)}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Delete failed')
        return
      }

      onMediaChange(media.filter(m => m.filename !== item.filename))
    } catch {
      setError('Failed to remove media')
    }
  }, [postId, media, onMediaChange])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length) {
      handleFiles(e.dataTransfer.files)
    }
  }, [handleFiles])

  const isImage = (type: string) => type.startsWith('image/')
  const isVideo = (type: string) => type.startsWith('video/')

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  }

  return (
    <div className="space-y-3">
      {/* Thumbnails */}
      {media.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {media.map((item) => (
            <div
              key={item.filename}
              className="relative group w-20 h-20 rounded-lg overflow-hidden border border-[var(--border)] bg-[var(--card)]"
            >
              {isImage(item.type) ? (
                <img
                  src={item.url}
                  alt={item.filename}
                  className="w-full h-full object-cover"
                />
              ) : isVideo(item.type) ? (
                <div className="w-full h-full flex items-center justify-center bg-[var(--card)]">
                  <Film className="w-6 h-6 text-[var(--muted)]" />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[var(--card)]">
                  <ImageIcon className="w-6 h-6 text-[var(--muted)]" />
                </div>
              )}
              <button
                onClick={() => handleRemove(item)}
                className="absolute top-0.5 right-0.5 p-0.5 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3 text-white" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5 text-[9px] text-white truncate opacity-0 group-hover:opacity-100 transition-opacity">
                {formatSize(item.size)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone / Upload button */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`
          flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed cursor-pointer
          transition-colors text-sm
          ${dragOver
            ? 'border-accent bg-accent/10 text-accent'
            : 'border-[var(--border)] text-[var(--muted)] hover:border-accent/50 hover:text-[var(--foreground)]'
          }
        `}
      >
        {uploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="w-4 h-4" />
            {media.length > 0 ? 'Add more media' : 'Drop files or click to upload'}
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime"
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  )
}

// Small thumbnail strip for preview/tooltip contexts
export function MediaThumbnails({ media, maxShow = 4 }: { media: MediaItem[]; maxShow?: number }) {
  if (!media?.length) return null

  const shown = media.slice(0, maxShow)
  const remaining = media.length - maxShow

  return (
    <div className="flex gap-1 mt-2">
      {shown.map((item) => (
        <div
          key={item.filename}
          className="w-12 h-12 rounded overflow-hidden border border-[var(--border)] bg-[var(--card)] flex-shrink-0"
        >
          {item.type.startsWith('image/') ? (
            <img src={item.url} alt={item.filename} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Film className="w-4 h-4 text-[var(--muted)]" />
            </div>
          )}
        </div>
      ))}
      {remaining > 0 && (
        <div className="w-12 h-12 rounded border border-[var(--border)] bg-[var(--card)] flex items-center justify-center text-xs text-[var(--muted)]">
          +{remaining}
        </div>
      )}
    </div>
  )
}
