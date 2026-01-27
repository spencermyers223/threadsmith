'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  FileText, Upload, Trash2, ChevronRight, ChevronDown, ChevronLeft, FileType, File,
  Folder, FolderOpen, MoreHorizontal, Pencil, Palette, FolderPlus, Check, Plus, X
} from 'lucide-react'
import { FileUploadModal } from '@/components/files/FileUploadModal'
import { FilePreviewModal } from '@/components/files/FilePreviewModal'

// Available folder colors
const FOLDER_COLORS = [
  { name: 'sand', label: 'Sand', class: 'text-sand', bg: 'bg-sand' },
  { name: 'blue', label: 'Blue', class: 'text-blue-400', bg: 'bg-blue-400' },
  { name: 'green', label: 'Green', class: 'text-green-400', bg: 'bg-green-400' },
  { name: 'red', label: 'Red', class: 'text-red-400', bg: 'bg-red-400' },
  { name: 'purple', label: 'Purple', class: 'text-purple-400', bg: 'bg-purple-400' },
  { name: 'pink', label: 'Pink', class: 'text-pink-400', bg: 'bg-pink-400' },
  { name: 'tan', label: 'Tan', class: 'text-sand-alt', bg: 'bg-sand-alt' },
  { name: 'cyan', label: 'Cyan', class: 'text-cyan-400', bg: 'bg-cyan-400' },
  { name: 'gray', label: 'Gray', class: 'text-gray-400', bg: 'bg-gray-400' },
  { name: 'orange', label: 'Orange', class: 'text-orange-400', bg: 'bg-orange-400' },
  { name: 'yellow', label: 'Yellow', class: 'text-yellow-400', bg: 'bg-yellow-400' },
  { name: 'emerald', label: 'Emerald', class: 'text-emerald-400', bg: 'bg-emerald-400' },
] as const

export interface FileRecord {
  id: string
  name: string
  file_type: string
  content: string | null
  created_at: string
  folder_id: string | null
}

interface FolderRecord {
  id: string
  name: string
  color: string
  created_at: string
}

interface FilesSidebarProps {
  isExpanded: boolean
  onToggleExpanded: () => void
  selectedFileId: string | null
  onSelectFile: (file: FileRecord | null) => void
  onEditFile?: (file: FileRecord) => void
  refreshTrigger?: number
}

// Tooltip component for collapsed state
function Tooltip({ children, label }: { children: React.ReactNode; label: string }) {
  const [show, setShow] = useState(false)

  return (
    <div
      className="relative"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 px-2 py-1 text-sm bg-[var(--card)] border border-[var(--border)] rounded-md shadow-lg whitespace-nowrap animate-fade-in">
          {label}
        </div>
      )}
    </div>
  )
}

export function FilesSidebar({ isExpanded, onToggleExpanded, selectedFileId, onSelectFile, onEditFile, refreshTrigger }: FilesSidebarProps) {
  const [files, setFiles] = useState<FileRecord[]>([])
  const [folders, setFolders] = useState<FolderRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [previewFile, setPreviewFile] = useState<FileRecord | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [draggedFileId, setDraggedFileId] = useState<string | null>(null)
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null)
  const [showNewFolderInput, setShowNewFolderInput] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; folderId: string } | null>(null)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null)
  const [editingFolderName, setEditingFolderName] = useState('')
  const newFolderInputRef = useRef<HTMLInputElement>(null)
  const editFolderInputRef = useRef<HTMLInputElement>(null)
  const sidebarRef = useRef<HTMLDivElement>(null)

  const supabase = createClient()

  const fetchFiles = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return

    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('user_id', userData.user.id)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setFiles(data)
    }
    setLoading(false)
  }, [supabase])

  const fetchFolders = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return

    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .eq('user_id', userData.user.id)
      .order('name', { ascending: true })

    if (!error && data) {
      setFolders(data)
    }
  }, [supabase])

  useEffect(() => {
    fetchFiles()
    fetchFolders()
  }, [fetchFiles, fetchFolders])

  // Refresh files when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      fetchFiles()
    }
  }, [refreshTrigger, fetchFiles])

  useEffect(() => {
    if (showNewFolderInput && newFolderInputRef.current) {
      newFolderInputRef.current.focus()
    }
  }, [showNewFolderInput])

  useEffect(() => {
    if (editingFolderId && editFolderInputRef.current) {
      editFolderInputRef.current.focus()
      editFolderInputRef.current.select()
    }
  }, [editingFolderId])

  // Close context menu when clicking outside
  const contextMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Don't close if clicking inside the context menu
      if (contextMenuRef.current?.contains(e.target as Node)) return
      setContextMenu(null)
      setShowColorPicker(false)
    }
    if (contextMenu) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [contextMenu])

  // Sidebar toggle is now explicit via the collapse/expand button only
  // No click-outside-to-close behavior

  const handleDeleteFile = async (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Delete this file?')) return

    const { error } = await supabase
      .from('files')
      .delete()
      .eq('id', fileId)

    if (!error) {
      setFiles(files.filter(f => f.id !== fileId))
      if (selectedFileId === fileId) {
        onSelectFile(null)
      }
    }
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      setShowNewFolderInput(false)
      return
    }

    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName.trim() }),
      })

      if (res.ok) {
        const folder = await res.json()
        setFolders([...folders, folder].sort((a, b) => a.name.localeCompare(b.name)))
        setExpandedFolders(new Set([...Array.from(expandedFolders), folder.id]))
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to create folder')
      }
    } catch (err) {
      console.error('Failed to create folder:', err)
    }

    setNewFolderName('')
    setShowNewFolderInput(false)
  }

  const handleRenameFolder = async (folderId: string) => {
    if (!editingFolderName.trim()) {
      setEditingFolderId(null)
      return
    }

    try {
      const res = await fetch(`/api/folders/${folderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingFolderName.trim() }),
      })

      if (res.ok) {
        const updatedFolder = await res.json()
        setFolders(folders.map(f => f.id === folderId ? updatedFolder : f).sort((a, b) => a.name.localeCompare(b.name)))
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to rename folder')
      }
    } catch (err) {
      console.error('Failed to rename folder:', err)
    }

    setEditingFolderId(null)
    setEditingFolderName('')
  }

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm('Delete this folder? Files will be moved to root.')) return

    try {
      const res = await fetch(`/api/folders/${folderId}`, { method: 'DELETE' })
      if (res.ok) {
        setFolders(folders.filter(f => f.id !== folderId))
        setFiles(files.map(f => f.folder_id === folderId ? { ...f, folder_id: null } : f))
        setExpandedFolders(prev => {
          const next = new Set(prev)
          next.delete(folderId)
          return next
        })
      }
    } catch (err) {
      console.error('Failed to delete folder:', err)
    }
  }

  const handleChangeFolderColor = async (folderId: string, color: string) => {
    // Optimistic update - change UI immediately
    const previousFolders = [...folders]
    setFolders(folders.map(f => f.id === folderId ? { ...f, color } : f))

    // Close menus immediately for responsive feel
    setContextMenu(null)
    setShowColorPicker(false)

    try {
      const res = await fetch(`/api/folders/${folderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color }),
      })

      if (!res.ok) {
        // Revert on error
        setFolders(previousFolders)
        const errorData = await res.json()
        console.error('Failed to change folder color:', errorData)
      }
    } catch (err) {
      // Revert on error
      setFolders(previousFolders)
      console.error('Failed to change folder color:', err)
    }
  }

  const getFolderColorClass = (colorName: string) => {
    const color = FOLDER_COLORS.find(c => c.name === colorName)
    return color?.class || 'text-sand'
  }

  const handleMoveFile = async (fileId: string, folderId: string | null) => {
    try {
      const res = await fetch(`/api/files/${fileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder_id: folderId }),
      })

      if (res.ok) {
        const updatedFile = await res.json()
        setFiles(files.map(f => f.id === fileId ? updatedFile : f))
      }
    } catch (err) {
      console.error('Failed to move file:', err)
    }
  }

  const handleDragStart = (e: React.DragEvent, fileId: string) => {
    e.dataTransfer.setData('text/plain', fileId)
    e.dataTransfer.effectAllowed = 'move'
    setDraggedFileId(fileId)
  }

  const handleDragEnd = () => {
    setDraggedFileId(null)
    setDragOverTarget(null)
  }

  const handleDragOver = (e: React.DragEvent, target: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverTarget(target)
  }

  const handleDragLeave = () => {
    setDragOverTarget(null)
  }

  const handleDrop = async (e: React.DragEvent, targetFolderId: string | null) => {
    e.preventDefault()
    const fileId = e.dataTransfer.getData('text/plain')
    if (fileId && fileId !== draggedFileId) return

    const file = files.find(f => f.id === fileId)
    if (!file || file.folder_id === targetFolderId) {
      setDragOverTarget(null)
      return
    }

    await handleMoveFile(fileId, targetFolderId)
    setDragOverTarget(null)
  }

  const handleContextMenu = (e: React.MouseEvent, folderId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, folderId })
  }

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      if (next.has(folderId)) {
        next.delete(folderId)
      } else {
        next.add(folderId)
      }
      return next
    })
  }

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'docx':
        return <FileType className="w-4 h-4 text-blue-400" />
      case 'md':
        return <FileText className="w-4 h-4 text-green-400" />
      default:
        return <File className="w-4 h-4 text-[var(--muted)]" />
    }
  }

  const getFilesInFolder = (folderId: string | null) => {
    return files.filter(f => f.folder_id === folderId)
  }

  const rootFiles = getFilesInFolder(null)

  const handleAddToGenerate = (file: FileRecord, e: React.MouseEvent) => {
    e.stopPropagation()
    onSelectFile(file)
  }

  const renderFile = (file: FileRecord) => {
    const isSelected = selectedFileId === file.id

    return (
      <li key={file.id}>
        <button
          draggable
          onDragStart={(e) => handleDragStart(e, file.id)}
          onDragEnd={handleDragEnd}
          onClick={() => onEditFile ? onEditFile(file) : setPreviewFile(file)}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-left group ${
            draggedFileId === file.id ? 'opacity-50' : ''
          } ${
            isSelected
              ? 'bg-accent/15 text-accent ring-1 ring-accent/30'
              : 'hover:bg-[var(--card-hover)]'
          }`}
        >
          {isSelected ? (
            <Check className="w-4 h-4 text-accent" />
          ) : (
            getFileIcon(file.file_type)
          )}
          <span className="flex-1 truncate text-sm">{file.name}</span>
          <div className="flex items-center gap-0.5">
            <button
              onClick={(e) => handleAddToGenerate(file, e)}
              className={`p-1 rounded transition-all ${
                isSelected
                  ? 'bg-accent/20 text-accent'
                  : 'opacity-0 group-hover:opacity-100 hover:bg-accent/20 text-[var(--muted)] hover:text-accent'
              }`}
              title="Add to generate prompt"
            >
              <Plus className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => handleDeleteFile(file.id, e)}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-red-400 transition-all"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </button>
      </li>
    )
  }

  const renderFolder = (folder: FolderRecord) => {
    const isFolderExpanded = expandedFolders.has(folder.id)
    const folderFiles = getFilesInFolder(folder.id)
    const isDragOver = dragOverTarget === folder.id

    return (
      <li key={folder.id}>
        <div
          className={`flex items-center gap-1 px-2 py-2 rounded-lg transition-colors cursor-pointer group ${
            isDragOver ? 'bg-accent/20 ring-1 ring-accent' : 'hover:bg-[var(--card-hover)]'
          }`}
          onClick={() => toggleFolder(folder.id)}
          onContextMenu={(e) => handleContextMenu(e, folder.id)}
          onDragOver={(e) => handleDragOver(e, folder.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, folder.id)}
        >
          {isFolderExpanded ? (
            <ChevronDown className="w-3 h-3 text-[var(--muted)]" />
          ) : (
            <ChevronRight className="w-3 h-3 text-[var(--muted)]" />
          )}
          {isFolderExpanded ? (
            <FolderOpen className={`w-4 h-4 ${getFolderColorClass(folder.color)}`} />
          ) : (
            <Folder className={`w-4 h-4 ${getFolderColorClass(folder.color)}`} />
          )}
          {editingFolderId === folder.id ? (
            <input
              ref={editFolderInputRef}
              type="text"
              value={editingFolderName}
              onChange={(e) => setEditingFolderName(e.target.value)}
              onBlur={() => handleRenameFolder(folder.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameFolder(folder.id)
                if (e.key === 'Escape') {
                  setEditingFolderId(null)
                  setEditingFolderName('')
                }
              }}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 bg-[var(--card)] px-1 py-0.5 rounded text-sm outline-none border border-accent"
            />
          ) : (
            <span className="flex-1 truncate text-sm">{folder.name}</span>
          )}
          {!isFolderExpanded && folderFiles.length > 0 && (
            <span className="text-xs text-[var(--muted)] bg-[var(--card)] px-1.5 py-0.5 rounded-full">
              {folderFiles.length}
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleContextMenu(e, folder.id)
            }}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[var(--card)] transition-all"
          >
            <MoreHorizontal className="w-3 h-3" />
          </button>
        </div>
        {isFolderExpanded && (
          <ul className="ml-4 mt-1 space-y-0.5 border-l border-[var(--border)] pl-2">
            {folderFiles.length === 0 ? (
              <li className="text-xs text-[var(--muted)] py-1 px-2">Empty folder</li>
            ) : (
              folderFiles.map(renderFile)
            )}
          </ul>
        )}
      </li>
    )
  }

  // Collapsed sidebar (icon rail)
  if (!isExpanded) {
    return (
      <div className="w-14 border-r border-[var(--border-subtle)] bg-[var(--background)] flex flex-col items-center py-4 gap-2">
        <Tooltip label="Expand sidebar">
          <button
            onClick={onToggleExpanded}
            className="p-3 rounded-xl hover:bg-[var(--card)] transition-all duration-150"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </Tooltip>

        <div className="w-8 h-px bg-[var(--border)] my-2" />

        <Tooltip label="Upload File">
          <button
            onClick={() => setShowUploadModal(true)}
            className="p-3 rounded-xl hover:bg-[var(--card)] transition-all duration-150"
          >
            <Upload className="w-5 h-5" />
          </button>
        </Tooltip>

        {/* Selected file indicator */}
        {selectedFileId && (
          <>
            <div className="w-8 h-px bg-[var(--border)] my-2" />
            <Tooltip label={files.find(f => f.id === selectedFileId)?.name || 'Selected file'}>
              <div className="p-2 rounded-xl bg-accent/20">
                <Check className="w-5 h-5 text-accent" />
              </div>
            </Tooltip>
          </>
        )}

        <div className="flex-1" />

        {showUploadModal && (
          <FileUploadModal
            onClose={() => setShowUploadModal(false)}
            onUploadComplete={() => {
              fetchFiles()
              setShowUploadModal(false)
            }}
          />
        )}

        {previewFile && (
          <FilePreviewModal
            file={previewFile}
            onClose={() => setPreviewFile(null)}
          />
        )}
      </div>
    )
  }

  // Expanded sidebar
  return (
    <>
      <aside
        ref={sidebarRef}
        className="w-72 border-r border-[var(--border)] bg-[var(--background-secondary)] flex flex-col animate-slide-in-left"
      >
        {/* Header */}
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="font-semibold">Files</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowNewFolderInput(true)}
              className="p-2 rounded-lg hover:bg-[var(--card)] transition-colors"
              title="New folder"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="p-2 rounded-lg hover:bg-[var(--card)] transition-colors"
              title="Upload file"
            >
              <Upload className="w-4 h-4" />
            </button>
            <button
              onClick={onToggleExpanded}
              className="p-2 rounded-lg hover:bg-[var(--card)] transition-colors"
              title="Collapse sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Selected file indicator */}
        {selectedFileId && (
          <div className="px-4 py-2 bg-accent/10 border-b border-[var(--border)] text-sm flex items-center gap-2">
            <Check className="w-4 h-4 text-accent flex-shrink-0" />
            <span className="text-[var(--muted)]">Using: </span>
            <span className="text-accent font-medium truncate">
              {files.find(f => f.id === selectedFileId)?.name || 'File'}
            </span>
            <button
              onClick={() => onSelectFile(null)}
              className="ml-auto p-1 hover:bg-[var(--border)] rounded text-[var(--muted)] hover:text-red-400"
              title="Clear selection"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Files list */}
        <div
          className={`flex-1 overflow-y-auto p-2 min-h-0 ${dragOverTarget === 'root' ? 'bg-accent/10' : ''}`}
          onDragOver={(e) => handleDragOver(e, 'root')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, null)}
        >
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : files.length === 0 && folders.length === 0 ? (
            <div className="text-center py-8 text-sm text-[var(--muted)]">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No files yet</p>
              <button
                onClick={() => setShowUploadModal(true)}
                className="mt-2 text-accent hover:underline"
              >
                Upload your first file
              </button>
            </div>
          ) : (
            <ul className="space-y-1">
              {/* New folder input */}
              {showNewFolderInput && (
                <li className="flex items-center gap-2 px-2 py-2">
                  <Folder className="w-4 h-4 text-sand" />
                  <input
                    ref={newFolderInputRef}
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onBlur={handleCreateFolder}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateFolder()
                      if (e.key === 'Escape') {
                        setShowNewFolderInput(false)
                        setNewFolderName('')
                      }
                    }}
                    placeholder="Folder name"
                    className="flex-1 bg-[var(--card)] px-2 py-1 rounded text-sm outline-none border border-accent"
                  />
                </li>
              )}

              {/* Folders */}
              {folders.map(renderFolder)}

              {/* Root-level files */}
              {rootFiles.length > 0 && folders.length > 0 && (
                <li className="pt-2 mt-2 border-t border-[var(--border)]">
                  <span className="text-xs text-[var(--muted)] px-2">Unfiled</span>
                </li>
              )}
              {rootFiles.map(renderFile)}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border)]">
          <p className="text-xs text-[var(--muted)]">
            Click file to edit. Click + to add to generate prompt.
          </p>
        </div>
      </aside>

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-lg py-1 z-50"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              const folder = folders.find(f => f.id === contextMenu.folderId)
              if (folder) {
                setEditingFolderId(folder.id)
                setEditingFolderName(folder.name)
              }
              setContextMenu(null)
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--background)] transition-colors"
          >
            <Pencil className="w-4 h-4" />
            Rename
          </button>
          <div className="relative">
            <button
              onMouseEnter={() => setShowColorPicker(true)}
              onClick={(e) => {
                e.stopPropagation()
                setShowColorPicker(!showColorPicker)
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--background)] transition-colors"
            >
              <Palette className="w-4 h-4" />
              Color
              <ChevronRight className={`w-3 h-3 ml-auto transition-transform ${showColorPicker ? 'rotate-90' : ''}`} />
            </button>
            {showColorPicker && (
              <div
                className="absolute left-full top-0 ml-1 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-lg p-2 min-w-[140px]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="grid grid-cols-4 gap-1">
                  {FOLDER_COLORS.map((color) => {
                    const currentFolder = folders.find(f => f.id === contextMenu.folderId)
                    const isSelected = currentFolder?.color === color.name
                    return (
                      <button
                        key={color.name}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleChangeFolderColor(contextMenu.folderId, color.name)
                        }}
                        className={`w-8 h-8 rounded-md flex items-center justify-center transition-all hover:scale-110 ${
                          isSelected ? 'ring-2 ring-white ring-offset-1 ring-offset-[var(--card)]' : ''
                        }`}
                        title={color.label}
                      >
                        <div className={`w-5 h-5 rounded-full ${color.bg}`} />
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => {
              handleDeleteFolder(contextMenu.folderId)
              setContextMenu(null)
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--background)] text-red-400 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      )}

      {showUploadModal && (
        <FileUploadModal
          onClose={() => setShowUploadModal(false)}
          onUploadComplete={() => {
            fetchFiles()
            setShowUploadModal(false)
          }}
        />
      )}

      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </>
  )
}
