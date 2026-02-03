'use client'

import { useState, useCallback } from 'react'
import { FilesSidebar, FileRecord } from '@/components/generate/FilesSidebar'
import WriteMode from '@/components/creator-hub/WriteMode'
import GenerateMode from '@/components/creator-hub/GenerateMode'
import TemplatesMode from '@/components/creator-hub/TemplatesMode'
import MediaMode from '@/components/creator-hub/MediaMode'
import RepurposeMode from '@/components/creator-hub/RepurposeMode'
import { PenLine, Layers, Lightbulb, Zap } from 'lucide-react'
import Image from 'lucide-react/icons/image'

type Mode = 'write' | 'braindump' | 'templates' | 'repurpose' | 'media'

export default function CreatorHubPage() {
  const [mode, setMode] = useState<Mode>('braindump')
  const [sidebarExpanded, setSidebarExpanded] = useState(true)
  const [selectedFile, setSelectedFile] = useState<FileRecord | null>(null)
  const [editingFile, setEditingFile] = useState<FileRecord | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Handle file selection for generate mode
  const handleFileSelect = (file: FileRecord | null) => {
    setSelectedFile(file)
  }

  // Handle editing a file (open in Write mode)
  const handleEditFile = useCallback((file: FileRecord) => {
    setEditingFile(file)
    setMode('write')
  }, [])

  // Handle creating a new file (clear editor)
  const handleNewFile = useCallback(() => {
    setEditingFile(null)
  }, [])

  // Handle saving file (callback from WriteMode)
  const handleFileSaved = useCallback((file: FileRecord) => {
    setEditingFile(file)
    setSelectedFile(file)
    // Trigger sidebar refresh
    setRefreshTrigger(prev => prev + 1)
  }, [])

  return (
    <div className="h-full flex flex-col">
      {/* Mode Toggle Header - always full width and centered */}
      <div className="border-b border-[var(--border)] bg-[var(--background)] flex-shrink-0">
        <div className="px-4 py-3 flex items-center justify-center gap-8">
          {/* Mode Toggle */}
          <div className="flex items-center gap-1 p-1 bg-[var(--card)] rounded-lg border border-[var(--border)]">
            <button
              onClick={() => setMode('write')}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
                ${mode === 'write'
                  ? 'bg-[var(--background)] text-[var(--foreground)] shadow-sm'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                }
              `}
            >
              <PenLine size={16} />
              Write
            </button>
            <button
              onClick={() => setMode('braindump')}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
                ${mode === 'braindump'
                  ? 'bg-[var(--background)] text-[var(--foreground)] shadow-sm'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                }
              `}
            >
              <Lightbulb size={16} />
              Brain Dump
            </button>
            <button
              onClick={() => setMode('templates')}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
                ${mode === 'templates'
                  ? 'bg-[var(--background)] text-[var(--foreground)] shadow-sm'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                }
              `}
            >
              <Layers size={16} />
              Templates
            </button>
            <button
              onClick={() => setMode('repurpose')}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
                ${mode === 'repurpose'
                  ? 'bg-[var(--background)] text-[var(--foreground)] shadow-sm'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                }
              `}
            >
              <Zap size={16} />
              Repurpose
            </button>
            <button
              onClick={() => setMode('media')}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
                ${mode === 'media'
                  ? 'bg-[var(--background)] text-[var(--foreground)] shadow-sm'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                }
              `}
            >
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image size={16} />
              Media
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Row */}
      <div className="flex-1 flex overflow-hidden">
        {/* File Sidebar - hidden in Media and Repurpose modes */}
        {mode !== 'media' && mode !== 'repurpose' && (
          <FilesSidebar
            isExpanded={sidebarExpanded}
            onToggleExpanded={() => setSidebarExpanded(!sidebarExpanded)}
            selectedFileId={selectedFile?.id || null}
            onSelectFile={handleFileSelect}
            onEditFile={handleEditFile}
            refreshTrigger={refreshTrigger}
          />
        )}

        {/* Mode Content */}
        <div className="flex-1 overflow-auto">
          {mode === 'write' && (
            <WriteMode
              editingFile={editingFile}
              onFileSaved={handleFileSaved}
              onNewFile={handleNewFile}
            />
          )}
          {mode === 'braindump' && (
            <GenerateMode
              selectedFile={selectedFile}
              onOpenSidebar={() => setSidebarExpanded(true)}
              onClearFile={() => setSelectedFile(null)}
            />
          )}
          {mode === 'templates' && (
            <TemplatesMode
              selectedFile={selectedFile}
              onOpenSidebar={() => setSidebarExpanded(true)}
              onClearFile={() => setSelectedFile(null)}
            />
          )}
          {mode === 'repurpose' && (
            <RepurposeMode />
          )}
          {mode === 'media' && (
            <MediaMode />
          )}
        </div>
      </div>
    </div>
  )
}
