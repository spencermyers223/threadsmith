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
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
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

  // Multi-select helpers
  const toggleItemSelection = (id: string) => {
    const newSelectedItems = new Set(selectedItems)
    if (newSelectedItems.has(id)) {
      newSelectedItems.delete(id)
    } else {
      newSelectedItems.add(id)
    }
    setSelectedItems(newSelectedItems)
  }

  const selectAllVisibleItems = () => {
    const visibleItemIds = filteredMedia.map(item => item.id)
    setSelectedItems(new Set(visibleItemIds))
  }

  const clearSelectedItems = () => {
    setSelectedItems(new Set())
  }

  // Rest of the previous code remains the same...

  return (
    <div className="h-full flex">
      {/* Sidebar and other previous code */}
      
      {/* Toolbar with multi-select support */}
      <div className="p-4 border-b border-[var(--border)] flex items-center gap-4">
        {selectedItems.size > 0 ? (
          <div className="flex items-center gap-4 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm text-[var(--muted)]">{selectedItems.size} selected</p>
              <button
                onClick={clearSelectedItems}
                className="text-xs hover:underline text-[var(--muted)]"
              >
                Clear
              </button>
            </div>
            <button
              onClick={() => {
                // Bulk actions implementation
                console.log('Bulk actions for:', Array.from(selectedItems))
              }}
              className="flex items-center gap-2 px-3 py-1.5 bg-accent/10 text-accent hover:bg-accent/20 rounded-lg text-sm"
            >
              Bulk Actions
            </button>
          </div>
        ) : (
          <>
            {/* Original search and filter UI */}
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
          </>
        )}

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

      {/* Rest of the code */}
    </div>
  )
}