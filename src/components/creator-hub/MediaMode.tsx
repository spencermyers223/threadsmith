'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import {
  Upload, Folder, FolderPlus, Image as ImageIcon, Film, Trash2,
  MoreVertical, Grid3X3, List, Check, X, Loader2, Search, Filter
} from 'lucide-react'

interface MediaItem {
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

type ViewMode = 'grid' | 'list'
type TypeFilter = 'all' | 'image' | 'video'
type SortBy = 'created_at' | 'filename' | 'size'

export default function MediaMode() {
  // State
  const [media, setMedia] = useState<MediaItem[]>([])
  const [folders, setFolders] = useState<MediaFolder[]>([])
  const [unfiledCount, setUnfiledCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null) // null = all, 'unfiled' = unfiled
  // const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set()) // TODO: multi-select
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [sortBy, setSortBy] = useState<SortBy>('created_at')
  const [searchQuery, setSearchQuery] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null)
  const [movingTo, setMovingTo] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch folders
  const fetchFolders = useCallback(async () => {
    const res = await fetch('/api/media/folders')
    if (res.ok) {
      const data = await res.json()
      setFolders(data.folders || [])
      setUnfiledCount(data.unfiled_count || 0)
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
    
    params.set('sort', sortBy)
    params.set('order', sortBy === 'filename' ? 'asc' : 'desc')
    params.set('limit', '100')

    const res = await fetch(`/api/media?${params}`)
    if (res.ok) {
      const data = await res.json()
      setMedia(data.media || [])
    }
    setLoading(false)
  }, [selectedFolder, typeFilter, sortBy])

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
          const err = await res.json()
          console.error('Upload failed:', err.error)
        }
      } catch (err) {
        console.error('Upload error:', err)
      }
    }

    setUploading(false)
    fetchMedia()
    fetchFolders()
  }, [selectedFolder, fetchMedia, fetchFolders])

  // Create folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    setCreatingFolder(true)

    const res = await fetch('/api/media/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newFolderName.trim() })
    })

    if (res.ok) {
      setNewFolderName('')
      setShowNewFolder(false)
      fetchFolders()
    }
    setCreatingFolder(false)
  }

  // Delete media
  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/media/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setMedia(prev => prev.filter(m => m.id !== id))
      fetchFolders()
    }
    setContextMenu(null)
  }

  // Move to folder
  const handleMove = async (mediaId: string, folderId: string | null) => {
    const res = await fetch(`/api/media/${mediaId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder_id: folderId })
    })
    if (res.ok) {
      fetchMedia()
      fetchFolders()
    }
    setMovingTo(null)
    setContextMenu(null)
  }

  // Delete folder
  const handleDeleteFolder = async (id: string) => {
    const res = await fetch(`/api/media/folders/${id}`, { method: 'DELETE' })
    if (res.ok) {
      if (selectedFolder === id) {
        setSelectedFolder(null)
      }
      fetchFolders()
      fetchMedia()
    }
  }

  // Filter media by search
  const filteredMedia = media.filter(m =>
    m.original_filename.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  }

  const isImage = (type: string) => type.startsWith('image/')
  const isVideo = (type: string) => type.startsWith('video/')

  return (
    <div className="h-full flex">
      {/* Sidebar - Folders */}
      <div className="w-56 border-r border-[var(--border)] p-4 flex flex-col">
        <h3 className="font-semibold text-sm text-[var(--muted)] uppercase tracking-wider mb-3">
          Folders
        </h3>

        <div className="space-y-1 flex-1">
          {/* All Media */}
          <button
            onClick={() => setSelectedFolder(null)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              selectedFolder === null
                ? 'bg-accent text-white'
                : 'hover:bg-[var(--card)]'
            }`}
          >
            <Grid3X3 size={16} />
            All Media
          </button>

          {/* Unfiled */}
          <button
            onClick={() => setSelectedFolder('unfiled')}
            className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              selectedFolder === 'unfiled'
                ? 'bg-accent text-white'
                : 'hover:bg-[var(--card)]'
            }`}
          >
            <span className="flex items-center gap-2">
              <ImageIcon size={16} />
              Unfiled
            </span>
            <span className="text-xs opacity-70">{unfiledCount}</span>
          </button>

          {/* User folders */}
          {folders.map(folder => (
            <div key={folder.id} className="group relative">
              <button
                onClick={() => setSelectedFolder(folder.id)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedFolder === folder.id
                    ? 'bg-accent text-white'
                    : 'hover:bg-[var(--card)]'
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  <Folder size={16} />
                  <span className="truncate">{folder.name}</span>
                </span>
                <span className="text-xs opacity-70">{folder.media_count}</span>
              </button>
              <button
                onClick={() => handleDeleteFolder(folder.id)}
                className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-[var(--muted)] hover:text-red-400 transition-all"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        {/* New Folder */}
        {showNewFolder ? (
          <div className="mt-2 flex items-center gap-1">
            <input
              type="text"
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              className="flex-1 px-2 py-1 text-sm bg-[var(--card)] border border-[var(--border)] rounded focus:outline-none focus:border-accent"
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') handleCreateFolder()
                if (e.key === 'Escape') {
                  setShowNewFolder(false)
                  setNewFolderName('')
                }
              }}
            />
            <button
              onClick={handleCreateFolder}
              disabled={creatingFolder}
              className="p-1 hover:bg-accent/20 rounded"
            >
              {creatingFolder ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            </button>
            <button
              onClick={() => { setShowNewFolder(false); setNewFolderName('') }}
              className="p-1 hover:bg-red-500/20 rounded"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowNewFolder(true)}
            className="mt-2 w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm border border-dashed border-[var(--border)] hover:border-accent text-[var(--muted)] hover:text-accent transition-colors"
          >
            <FolderPlus size={16} />
            New Folder
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-[var(--border)] flex items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search media..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-[var(--card)] border border-[var(--border)] rounded-lg focus:outline-none focus:border-accent"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-[var(--muted)]" />
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as TypeFilter)}
              className="px-2 py-1.5 text-sm bg-[var(--card)] border border-[var(--border)] rounded-lg focus:outline-none"
            >
              <option value="all">All Types</option>
              <option value="image">Images</option>
              <option value="video">Videos</option>
            </select>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortBy)}
              className="px-2 py-1.5 text-sm bg-[var(--card)] border border-[var(--border)] rounded-lg focus:outline-none"
            >
              <option value="created_at">Recent</option>
              <option value="filename">Name</option>
              <option value="size">Size</option>
            </select>
          </div>

          {/* View Toggle */}
          <div className="flex items-center border border-[var(--border)] rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-accent text-white' : 'hover:bg-[var(--card)]'}`}
            >
              <Grid3X3 size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-accent text-white' : 'hover:bg-[var(--card)]'}`}
            >
              <List size={16} />
            </button>
          </div>

          {/* Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Upload size={16} />
            )}
            Upload
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

        {/* Media Grid/List */}
        <div
          className={`flex-1 overflow-auto p-4 ${dragOver ? 'bg-accent/5' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => {
            e.preventDefault()
            setDragOver(false)
            if (e.dataTransfer.files.length) {
              handleUpload(e.dataTransfer.files)
            }
          }}
        >
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 size={32} className="animate-spin text-[var(--muted)]" />
            </div>
          ) : filteredMedia.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-[var(--muted)]">
              <ImageIcon size={48} className="mb-4 opacity-50" />
              <p className="text-lg font-medium">No media yet</p>
              <p className="text-sm">Upload images or videos to get started</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredMedia.map(item => (
                <div
                  key={item.id}
                  className="group relative aspect-square bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-hidden hover:border-accent transition-colors"
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
                      <Film size={32} className="text-[var(--muted)]" />
                    </div>
                  ) : null}

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />

                  {/* Actions */}
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      setContextMenu({ id: item.id, x: e.clientX, y: e.clientY })
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                  >
                    <MoreVertical size={14} className="text-white" />
                  </button>

                  {/* Info */}
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-xs text-white truncate">{item.original_filename}</p>
                    <p className="text-[10px] text-white/70">{formatSize(item.size)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredMedia.map(item => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 p-3 bg-[var(--card)] border border-[var(--border)] rounded-lg hover:border-accent transition-colors"
                >
                  <div className="w-12 h-12 rounded overflow-hidden bg-[var(--background)] flex-shrink-0">
                    {isImage(item.type) ? (
                      <Image
                        src={item.url}
                        alt={item.original_filename}
                        width={48}
                        height={48}
                        className="object-cover w-full h-full"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Film size={20} className="text-[var(--muted)]" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.original_filename}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {formatSize(item.size)} • {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {item.folder && (
                    <span className="px-2 py-1 text-xs bg-[var(--background)] rounded">
                      {item.folder.name}
                    </span>
                  )}
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      setContextMenu({ id: item.id, x: e.clientX, y: e.clientY })
                    }}
                    className="p-2 hover:bg-[var(--background)] rounded-lg"
                  >
                    <MoreVertical size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
          />
          <div
            className="fixed z-50 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-lg py-1 min-w-[160px]"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            {movingTo === contextMenu.id ? (
              <div className="p-2">
                <p className="text-xs text-[var(--muted)] mb-2">Move to folder:</p>
                <button
                  onClick={() => handleMove(contextMenu.id, null)}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-[var(--background)] rounded"
                >
                  Unfiled
                </button>
                {folders.map(f => (
                  <button
                    key={f.id}
                    onClick={() => handleMove(contextMenu.id, f.id)}
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-[var(--background)] rounded"
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            ) : (
              <>
                <button
                  onClick={() => setMovingTo(contextMenu.id)}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--background)] flex items-center gap-2"
                >
                  <Folder size={14} />
                  Move to Folder
                </button>
                <button
                  onClick={() => handleDelete(contextMenu.id)}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-red-500/10 text-red-400 flex items-center gap-2"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
