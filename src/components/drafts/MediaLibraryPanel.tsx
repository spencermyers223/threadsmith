'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import {
  ChevronDown, ChevronRight, Folder, Image as ImageIcon,
  Film, Loader2, Plus
} from 'lucide-react'
import type { MediaItem } from '@/components/drafts/MediaUpload'

interface UserMediaItem {
  id: string
  url: string
  filename: string
  original_filename: string
  type: string
  size: number
  folder_id: string | null
  created_at: string
  folder?: { id: string; name: string } | null
}

interface MediaFolder {
  id: string
  name: string
  media_count: number
}

interface MediaLibraryPanelProps {
  onSelectMedia: (media: MediaItem) => void
  postId?: string | null // Reserved for future: direct upload to post
  onSaveFirst?: () => Promise<string | null> // Reserved for future
}

export function MediaLibraryPanel({ onSelectMedia }: MediaLibraryPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [media, setMedia] = useState<UserMediaItem[]>([])
  const [folders, setFolders] = useState<MediaFolder[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedFolder] = useState<string | null>(null) // TODO: folder filtering in panel
  const [typeFilter, setTypeFilter] = useState<'all' | 'image' | 'video'>('all')
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['recent']))

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch folders
  const fetchFolders = useCallback(async () => {
    const res = await fetch('/api/media/folders')
    if (res.ok) {
      const data = await res.json()
      setFolders(data.folders || [])
    }
  }, [])

  // Fetch media
  const fetchMedia = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    
    if (selectedFolder === 'unfiled') {
      params.set('folder_id', 'unfiled')
    } else if (selectedFolder) {
      params.set('folder_id', selectedFolder)
    }
    
    if (typeFilter !== 'all') {
      params.set('type', typeFilter)
    }
    
    params.set('sort', 'created_at')
    params.set('order', 'desc')
    params.set('limit', '50')

    const res = await fetch(`/api/media?${params}`)
    if (res.ok) {
      const data = await res.json()
      setMedia(data.media || [])
    }
    setLoading(false)
  }, [selectedFolder, typeFilter])

  useEffect(() => {
    fetchFolders()
  }, [fetchFolders])

  useEffect(() => {
    fetchMedia()
  }, [fetchMedia])

  // Upload handler
  const handleUpload = useCallback(async (files: FileList | File[]) => {
    setUploading(true)
    
    for (const file of Array.from(files)) {
      const formData = new FormData()
      formData.append('file', file)
      if (selectedFolder && selectedFolder !== 'unfiled') {
        formData.append('folder_id', selectedFolder)
      }

      try {
        const res = await fetch('/api/media', {
          method: 'POST',
          body: formData
        })
        if (!res.ok) {
          console.error('Upload failed')
        }
      } catch (err) {
        console.error('Upload error:', err)
      }
    }

    setUploading(false)
    fetchMedia()
    fetchFolders()
  }, [selectedFolder, fetchMedia, fetchFolders])

  // Handle selecting media to attach to post
  const handleSelectMedia = (item: UserMediaItem) => {
    const mediaItem: MediaItem = {
      url: item.url,
      type: item.type,
      filename: item.original_filename,
      size: item.size,
      created_at: item.created_at
    }
    onSelectMedia(mediaItem)
  }

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId)
    } else {
      newExpanded.add(folderId)
    }
    setExpandedFolders(newExpanded)
  }

  const isImage = (type: string) => type.startsWith('image/')
  const isVideo = (type: string) => type.startsWith('video/')

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  }

  // Group media by folders for display
  const recentMedia = media.slice(0, 12)
  const mediaByFolder: Record<string, UserMediaItem[]> = {}
  
  media.forEach(item => {
    const folderId = item.folder_id || 'unfiled'
    if (!mediaByFolder[folderId]) {
      mediaByFolder[folderId] = []
    }
    mediaByFolder[folderId].push(item)
  })

  if (!isExpanded) {
    return (
      <div className="border-t border-[var(--border)] p-3">
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full flex items-center justify-between text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          <span className="flex items-center gap-2">
            <ImageIcon size={16} />
            Media Library
          </span>
          <ChevronRight size={16} />
        </button>
      </div>
    )
  }

  return (
    <div className="border-t border-[var(--border)] flex flex-col max-h-[400px]">
      {/* Header */}
      <div className="p-3 border-b border-[var(--border)] flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(false)}
          className="flex items-center gap-2 text-sm font-medium"
        >
          <ChevronDown size={16} />
          Media Library
        </button>
        
        <div className="flex items-center gap-2">
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as 'all' | 'image' | 'video')}
            className="text-xs px-2 py-1 bg-[var(--card)] border border-[var(--border)] rounded"
          >
            <option value="all">All</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
          </select>

          {/* Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="p-1.5 hover:bg-[var(--card)] rounded transition-colors"
            title="Upload media"
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            className="hidden"
            onChange={e => e.target.files && handleUpload(e.target.files)}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={24} className="animate-spin text-[var(--muted)]" />
          </div>
        ) : media.length === 0 ? (
          <div className="text-center py-8 text-[var(--muted)]">
            <ImageIcon size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No media yet</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 text-xs text-accent hover:underline"
            >
              Upload your first media
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Recent Section */}
            <div>
              <button
                onClick={() => toggleFolder('recent')}
                className="flex items-center gap-2 text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-2 w-full"
              >
                {expandedFolders.has('recent') ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                Recent
              </button>
              {expandedFolders.has('recent') && (
                <div className="grid grid-cols-4 gap-2">
                  {recentMedia.map(item => (
                    <button
                      key={item.id}
                      onClick={() => handleSelectMedia(item)}
                      className="aspect-square rounded-lg overflow-hidden border border-[var(--border)] hover:border-accent transition-colors bg-[var(--card)] relative group"
                      title={`${item.original_filename} (${formatSize(item.size)})`}
                    >
                      {isImage(item.type) ? (
                        <Image
                          src={item.url}
                          alt={item.original_filename}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : isVideo(item.type) ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <Film size={20} className="text-[var(--muted)]" />
                        </div>
                      ) : null}
                      <div className="absolute inset-0 bg-accent/0 group-hover:bg-accent/20 transition-colors flex items-center justify-center">
                        <Plus size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Folders */}
            {folders.map(folder => (
              <div key={folder.id}>
                <button
                  onClick={() => toggleFolder(folder.id)}
                  className="flex items-center gap-2 text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-2 w-full"
                >
                  {expandedFolders.has(folder.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <Folder size={14} />
                  {folder.name}
                  <span className="text-[10px] opacity-70">({folder.media_count})</span>
                </button>
                {expandedFolders.has(folder.id) && mediaByFolder[folder.id] && (
                  <div className="grid grid-cols-4 gap-2">
                    {mediaByFolder[folder.id].slice(0, 8).map(item => (
                      <button
                        key={item.id}
                        onClick={() => handleSelectMedia(item)}
                        className="aspect-square rounded-lg overflow-hidden border border-[var(--border)] hover:border-accent transition-colors bg-[var(--card)] relative group"
                        title={`${item.original_filename} (${formatSize(item.size)})`}
                      >
                        {isImage(item.type) ? (
                          <Image
                            src={item.url}
                            alt={item.original_filename}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : isVideo(item.type) ? (
                          <div className="w-full h-full flex items-center justify-center">
                            <Film size={20} className="text-[var(--muted)]" />
                          </div>
                        ) : null}
                        <div className="absolute inset-0 bg-accent/0 group-hover:bg-accent/20 transition-colors flex items-center justify-center">
                          <Plus size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Drop zone hint */}
      <div className="p-2 border-t border-[var(--border)] text-center">
        <p className="text-[10px] text-[var(--muted)]">
          Click media to attach to post • Drop files to upload
        </p>
      </div>
    </div>
  )
}
