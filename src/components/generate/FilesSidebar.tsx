'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  FileText, Upload, Trash2, ChevronRight, ChevronDown, FileType, File,
  Folder, FolderOpen, X, Check
} from 'lucide-react'
import { FileUploadModal } from '@/components/files/FileUploadModal'

interface FileRecord {
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

// Folder colors matching the main sidebar
const FOLDER_COLORS: Record<string, string> = {
  sand: 'text-sand',
  blue: 'text-blue-400',
  green: 'text-green-400',
  red: 'text-red-400',
  purple: 'text-purple-400',
  pink: 'text-pink-400',
  tan: 'text-sand-alt',
  cyan: 'text-cyan-400',
  gray: 'text-gray-400',
}

interface FilesSidebarProps {
  isOpen: boolean
  onClose: () => void
  selectedFileId: string | null
  onSelectFile: (file: FileRecord | null) => void
}

export function FilesSidebar({ isOpen, onClose, selectedFileId, onSelectFile }: FilesSidebarProps) {
  const [files, setFiles] = useState<FileRecord[]>([])
  const [folders, setFolders] = useState<FolderRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
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
    if (isOpen) {
      fetchFiles()
      fetchFolders()
    }
  }, [isOpen, fetchFiles, fetchFolders])

  // Close sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isOpen && sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, onClose])

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

  const getFolderColorClass = (colorName: string) => {
    return FOLDER_COLORS[colorName] || 'text-sand'
  }

  const getFilesInFolder = (folderId: string | null) => {
    return files.filter(f => f.folder_id === folderId)
  }

  const handleSelectFile = (file: FileRecord) => {
    if (selectedFileId === file.id) {
      onSelectFile(null) // Deselect if already selected
    } else {
      onSelectFile(file)
    }
  }

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

  const rootFiles = getFilesInFolder(null)

  const renderFile = (file: FileRecord) => {
    const isSelected = selectedFileId === file.id

    return (
      <li key={file.id}>
        <button
          onClick={() => handleSelectFile(file)}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-left group ${
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
          <button
            onClick={(e) => handleDeleteFile(file.id, e)}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-red-400 transition-all"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </button>
      </li>
    )
  }

  const renderFolder = (folder: FolderRecord) => {
    const isExpanded = expandedFolders.has(folder.id)
    const folderFiles = getFilesInFolder(folder.id)

    return (
      <li key={folder.id}>
        <div
          className="flex items-center gap-1 px-2 py-2 rounded-lg hover:bg-[var(--card-hover)] transition-colors cursor-pointer"
          onClick={() => toggleFolder(folder.id)}
        >
          {isExpanded ? (
            <ChevronDown className="w-3 h-3 text-[var(--muted)]" />
          ) : (
            <ChevronRight className="w-3 h-3 text-[var(--muted)]" />
          )}
          {isExpanded ? (
            <FolderOpen className={`w-4 h-4 ${getFolderColorClass(folder.color)}`} />
          ) : (
            <Folder className={`w-4 h-4 ${getFolderColorClass(folder.color)}`} />
          )}
          <span className="flex-1 truncate text-sm">{folder.name}</span>
          {!isExpanded && folderFiles.length > 0 && (
            <span className="text-xs text-[var(--muted)] bg-[var(--card)] px-1.5 py-0.5 rounded-full">
              {folderFiles.length}
            </span>
          )}
        </div>
        {isExpanded && (
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

  if (!isOpen) return null

  return (
    <>
      <aside
        ref={sidebarRef}
        className="fixed left-0 top-14 bottom-0 w-72 border-r border-[var(--border)] bg-[var(--background-secondary)] flex flex-col z-40 animate-slide-in-left"
      >
        {/* Header */}
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="font-semibold">Select a File</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowUploadModal(true)}
              className="p-2 rounded-lg hover:bg-[var(--card)] transition-colors"
              title="Upload file"
            >
              <Upload className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[var(--card)] transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Selected file indicator */}
        {selectedFileId && (
          <div className="px-4 py-2 bg-accent/10 border-b border-[var(--border)] text-sm">
            <span className="text-[var(--muted)]">Selected: </span>
            <span className="text-accent font-medium">
              {files.find(f => f.id === selectedFileId)?.name || 'File'}
            </span>
          </div>
        )}

        {/* Files list */}
        <div className="flex-1 overflow-y-auto p-2">
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
            Select a file to use its content as context for generation.
          </p>
        </div>
      </aside>

      {showUploadModal && (
        <FileUploadModal
          onClose={() => setShowUploadModal(false)}
          onUploadComplete={() => {
            fetchFiles()
            setShowUploadModal(false)
          }}
        />
      )}
    </>
  )
}
