'use client'

import { X, FileText } from 'lucide-react'

interface FileRecord {
  id: string
  name: string
  file_type: string
  content: string | null
  created_at: string
}

interface FilePreviewModalProps {
  file: FileRecord
  onClose: () => void
}

export function FilePreviewModal({ file, onClose }: FilePreviewModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--background)] border border-[var(--border)] rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[var(--muted)]" />
            <h2 className="font-semibold truncate">{file.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-[var(--card)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {file.content ? (
            <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
              {file.content}
            </pre>
          ) : (
            <p className="text-[var(--muted)] text-center py-8">
              No content available
            </p>
          )}
        </div>

        <div className="p-4 border-t border-[var(--border)] flex justify-between items-center text-sm text-[var(--muted)]">
          <span>Type: {file.file_type.toUpperCase()}</span>
          <span>
            Uploaded: {new Date(file.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  )
}
