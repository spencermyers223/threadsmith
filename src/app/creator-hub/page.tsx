'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FilesSidebar, FileRecord } from '@/components/generate/FilesSidebar'
import WriteMode from '@/components/creator-hub/WriteMode'
import GenerateMode from '@/components/creator-hub/GenerateMode'
import { PenLine, Sparkles } from 'lucide-react'

type Mode = 'write' | 'generate'

export default function CreatorHubPage() {
  const [mode, setMode] = useState<Mode>('generate')
  const [sidebarExpanded, setSidebarExpanded] = useState(true)
  const [selectedFile, setSelectedFile] = useState<FileRecord | null>(null)
  const [editingFile, setEditingFile] = useState<FileRecord | null>(null)

  // Handle file selection for generate mode
  const handleFileSelect = (file: FileRecord | null) => {
    setSelectedFile(file)
  }

  // Handle opening a file in write mode
  const handleOpenInWriteMode = (file: FileRecord) => {
    setEditingFile(file)
    setMode('write')
    setSidebarExpanded(false)
  }

  // Handle creating a new note
  const handleCreateNewNote = () => {
    setEditingFile(null) // Clear editing file to create new
    setMode('write')
  }

  // Handle saving file (callback from WriteMode)
  const handleFileSaved = useCallback((file: FileRecord) => {
    setEditingFile(file)
    setSelectedFile(file)
  }, [])

  return (
    <div className="h-full flex">
      {/* File Sidebar */}
      <FilesSidebar
        isExpanded={sidebarExpanded}
        onToggleExpanded={() => setSidebarExpanded(!sidebarExpanded)}
        selectedFileId={selectedFile?.id || null}
        onSelectFile={handleFileSelect}
      />

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
                onClick={() => setMode('generate')}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
                  ${mode === 'generate'
                    ? 'bg-[var(--background)] text-[var(--foreground)] shadow-sm'
                    : 'text-[var(--muted)] hover:text-[var(--foreground)]'
                  }
                `}
              >
                <Sparkles size={16} />
                Generate
              </button>
            </div>

            {/* Mode description */}
            <p className="text-sm text-[var(--muted)] hidden sm:block">
              {mode === 'write'
                ? 'Write and organize your research notes'
                : 'Generate algorithm-optimized posts'
              }
            </p>
          </div>
        </div>

        {/* Mode Content */}
        <div className="flex-1 overflow-auto">
          {mode === 'write' ? (
            <WriteMode
              editingFile={editingFile}
              onFileSaved={handleFileSaved}
              onCreateNew={handleCreateNewNote}
            />
          ) : (
            <GenerateMode
              selectedFile={selectedFile}
              onOpenSidebar={() => setSidebarExpanded(true)}
              onClearFile={() => setSelectedFile(null)}
            />
          )}
        </div>
      </div>
    </div>
  )
}
