'use client'

import { useState, useCallback } from 'react'
import { FilesSidebar, FileRecord } from '@/components/generate/FilesSidebar'
import WriteMode from '@/components/creator-hub/WriteMode'
import GenerateMode from '@/components/creator-hub/GenerateMode'
import TemplatesMode from '@/components/creator-hub/TemplatesMode'
import MediaMode from '@/components/creator-hub/MediaMode'
import { PenLine, Layers, Lightbulb, Image } from 'lucide-react'

type Mode = 'write' | 'braindump' | 'templates' | 'media'

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
    <div className="h-full flex">
      {/* File Sidebar - hidden in Media mode */}
      {mode !== 'media' && (
        <FilesSidebar
          isExpanded={sidebarExpanded}
          onToggleExpanded={() => setSidebarExpanded(!sidebarExpanded)}
          selectedFileId={selectedFile?.id || null}
          onSelectFile={handleFileSelect}
          onEditFile={handleEditFile}
          refreshTrigger={refreshTrigger}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mode Toggle Header */}
        <div className="border-b border-[var(--border)] bg-[var(--background)]">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
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
                onClick={() => setMode('media')}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
                  ${mode === 'media'
                    ? 'bg-[var(--background)] text-[var(--foreground)] shadow-sm'
                    : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                  }
                `}
              >
                <Image size={16} />
                Media
              </button>
            </div>

            {/* Mode description */}
            <p className="text-sm text-[var(--muted)] hidden sm:block">
              {mode === 'write' && 'Write and organize your research notes'}
              {mode === 'braindump' && 'Free-flow your ideas and get inspired'}
              {mode === 'templates' && 'Use presets for quick generation'}
              {mode === 'media' && 'Upload and organize your media library'}
            </p>
          </div>
        </div>

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
          {mode === 'media' && (
            <MediaMode />
          )}
        </div>
      </div>
    </div>
  )
}
