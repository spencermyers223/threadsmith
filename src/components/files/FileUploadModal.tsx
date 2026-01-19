'use client'

import { useState, useRef } from 'react'
import { X, Upload, AlertCircle } from 'lucide-react'

interface FileUploadModalProps {
  onClose: () => void
  onUploadComplete: () => void
}

export function FileUploadModal({ onClose, onUploadComplete }: FileUploadModalProps) {
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files)
    }
  }

  const handleFiles = async (files: FileList) => {
    const file = files[0]
    const validExtensions = ['.docx', '.md', '.txt']

    const ext = '.' + file.name.split('.').pop()?.toLowerCase()

    if (!validExtensions.includes(ext)) {
      setError('Please upload a .docx, .md, or .txt file')
      return
    }

    setError(null)
    setUploading(true)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/files', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Upload failed')
      }

      onUploadComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--background)] border border-[var(--border)] rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h2 className="font-semibold">Upload File</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-[var(--card)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-accent bg-accent/10'
                : 'border-[var(--border)] hover:border-[var(--muted)]'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-[var(--muted)]">Uploading...</p>
              </div>
            ) : (
              <>
                <Upload className="w-10 h-10 mx-auto mb-3 text-[var(--muted)]" />
                <p className="mb-2">Drag and drop your file here</p>
                <p className="text-sm text-[var(--muted)] mb-4">
                  Supports .docx, .md, and .txt files
                </p>
                <button
                  onClick={() => inputRef.current?.click()}
                  className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-md transition-colors"
                >
                  Browse Files
                </button>
                <input
                  ref={inputRef}
                  type="file"
                  className="hidden"
                  accept=".docx,.md,.txt"
                  onChange={handleChange}
                />
              </>
            )}
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
