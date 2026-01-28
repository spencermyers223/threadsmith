'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import Image from '@tiptap/extension-image'
import {
  Save, Loader2, Bold, Italic, List, ListOrdered, Link as LinkIcon,
  Heading1, Heading2, Quote, Undo, Redo, FileText, FilePlus, Check, ImageIcon
} from 'lucide-react'
import type { FileRecord } from '@/components/generate/FilesSidebar'

interface WriteModeProps {
  editingFile: FileRecord | null
  onFileSaved: (file: FileRecord) => void
  onNewFile: () => void
}

export default function WriteMode({ editingFile, onFileSaved, onNewFile }: WriteModeProps) {
  const [title, setTitle] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showSaveSuccess, setShowSaveSuccess] = useState(false)

  const supabase = createClient()
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-[var(--accent)] underline',
        },
      }),
      Placeholder.configure({
        placeholder: 'Start writing your research notes...',
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Image.configure({
        inline: false,
        allowBase64: false,
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm prose-invert max-w-none focus:outline-none min-h-[400px] p-4',
      },
    },
    onUpdate: () => {
      setHasUnsavedChanges(true)
    },
  })

  // Convert plain text with line breaks to proper HTML for Tiptap
  // This handles legacy plain text content and uploaded text files
  const convertTextToHtml = (text: string): string => {
    if (!text) return ''

    // Check if content is already HTML (saved from Tiptap)
    // Look for common HTML tags that Tiptap would produce
    if (/<(?:p|ul|ol|li|h[1-6]|blockquote|strong|em|table|tr|td|th)[>\s]/i.test(text)) {
      return text // Already HTML, return as-is
    }

    // Pre-process: convert markdown tables to HTML tables
    const tableRegex = /^(\|[^\n]+\|\n)((?:\|[-: ]+\|[-: |\n]*\n)?)((?:\|[^\n]+\|\n?)*)/gm
    text = text.replace(tableRegex, (match, headerRow, separatorRow, bodyRows) => {
      const parseRow = (row: string, cellTag: string) => {
        const cells = row.trim().split('|').filter(c => c.trim() !== '' && !c.match(/^[-: ]+$/))
        return `<tr>${cells.map(c => `<${cellTag}>${c.trim()}</${cellTag}>`).join('')}</tr>`
      }
      
      let html = '<table>'
      html += `<thead>${parseRow(headerRow, 'th')}</thead>`
      html += '<tbody>'
      const rows = bodyRows.trim().split('\n').filter((r: string) => r.trim())
      rows.forEach((row: string) => {
        html += parseRow(row, 'td')
      })
      html += '</tbody></table>'
      return html
    })

    // Plain text conversion - parse line by line
    const lines = text.split('\n')
    const result: string[] = []
    let inBulletList = false
    let inOrderedList = false

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const trimmedLine = line.trim()

      // Check for bullet point (- or *)
      const bulletMatch = trimmedLine.match(/^[-*]\s+(.*)$/)
      // Check for numbered list (1. 2. etc)
      const orderedMatch = trimmedLine.match(/^\d+\.\s+(.*)$/)

      if (bulletMatch) {
        // Start bullet list if not already in one
        if (!inBulletList) {
          if (inOrderedList) {
            result.push('</ol>')
            inOrderedList = false
          }
          result.push('<ul>')
          inBulletList = true
        }
        result.push(`<li>${bulletMatch[1]}</li>`)
      } else if (orderedMatch) {
        // Start ordered list if not already in one
        if (!inOrderedList) {
          if (inBulletList) {
            result.push('</ul>')
            inBulletList = false
          }
          result.push('<ol>')
          inOrderedList = true
        }
        result.push(`<li>${orderedMatch[1]}</li>`)
      } else {
        // Close any open lists
        if (inBulletList) {
          result.push('</ul>')
          inBulletList = false
        }
        if (inOrderedList) {
          result.push('</ol>')
          inOrderedList = false
        }

        if (!trimmedLine) {
          // Empty line becomes an empty paragraph (creates visual spacing)
          result.push('<p></p>')
        } else if (/^#{1,3}\s/.test(trimmedLine)) {
          // Check for headers (# markdown style)
          const level = trimmedLine.match(/^(#{1,3})/)?.[1].length || 1
          const headerText = trimmedLine.replace(/^#{1,3}\s/, '')
          result.push(`<h${level}>${headerText}</h${level}>`)
        } else if (/^>\s/.test(trimmedLine)) {
          // Blockquote
          const quoteText = trimmedLine.replace(/^>\s/, '')
          result.push(`<blockquote><p>${quoteText}</p></blockquote>`)
        } else {
          result.push(`<p>${trimmedLine}</p>`)
        }
      }
    }

    // Close any remaining open lists
    if (inBulletList) result.push('</ul>')
    if (inOrderedList) result.push('</ol>')

    return result.join('')
  }

  // Load file content when editingFile changes
  useEffect(() => {
    if (editingFile) {
      setTitle(editingFile.name || '')
      const content = editingFile.content || ''
      const htmlContent = convertTextToHtml(content)
      editor?.commands.setContent(htmlContent)
      setHasUnsavedChanges(false)
    } else {
      // New file
      setTitle('')
      editor?.commands.setContent('')
      setHasUnsavedChanges(false)
    }
  }, [editingFile, editor])

  const handleSave = useCallback(async () => {
    if (!editor) return
    if (!title.trim()) {
      alert('Please enter a title for your note')
      return
    }

    setIsSaving(true)

    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Not authenticated')

      // Get HTML content to preserve formatting (bullet points, headers, bold, etc.)
      const content = editor.getHTML()

      if (editingFile) {
        // Update existing file
        const { data, error } = await supabase
          .from('files')
          .update({
            name: title.trim(),
            content,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingFile.id)
          .select()
          .single()

        if (error) throw error
        onFileSaved(data)
      } else {
        // Create new file
        const { data, error } = await supabase
          .from('files')
          .insert({
            user_id: userData.user.id,
            name: title.trim(),
            content,
            file_type: 'note',
          })
          .select()
          .single()

        if (error) throw error
        onFileSaved(data)
      }

      setLastSaved(new Date())
      setHasUnsavedChanges(false)
      // Show success toast
      setShowSaveSuccess(true)
      setTimeout(() => setShowSaveSuccess(false), 2000)
    } catch (err) {
      console.error('Save error:', err)
      alert(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }, [editor, title, editingFile, supabase, onFileSaved])

  // Auto-save on Cmd/Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleSave])

  const addLink = () => {
    const url = prompt('Enter URL:')
    if (url) {
      editor?.chain().focus().setLink({ href: url }).run()
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editor) return

    setIsUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/files/images', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      editor.chain().focus().setImage({ src: data.url }).run()
    } catch (err) {
      console.error('Image upload error:', err)
      alert(err instanceof Error ? err.message : 'Failed to upload image')
    } finally {
      setIsUploadingImage(false)
      if (imageInputRef.current) imageInputRef.current.value = ''
    }
  }

  const handleNewFile = () => {
    // Confirm if there are unsaved changes
    if (hasUnsavedChanges) {
      if (!confirm('You have unsaved changes. Start a new file anyway?')) {
        return
      }
    }
    // Clear everything
    setTitle('')
    editor?.commands.setContent('')
    setHasUnsavedChanges(false)
    setLastSaved(null)
    onNewFile()
    // Focus the title input
    setTimeout(() => {
      const titleInput = document.querySelector('input[placeholder="Untitled Note"]') as HTMLInputElement
      titleInput?.focus()
    }, 100)
  }

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--muted)]" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col relative">
      {/* Success Toast */}
      {showSaveSuccess && (
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/30 text-green-400 rounded-lg text-sm animate-fade-in">
          <Check size={16} />
          File saved successfully
        </div>
      )}

      {/* Title and Save Bar */}
      <div className="border-b border-[var(--border)] bg-[var(--background)]">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
          {/* New File Button */}
          <button
            onClick={handleNewFile}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-[var(--border)] hover:bg-[var(--card)] transition-colors"
            title="New File"
          >
            <FilePlus size={16} />
            <span className="hidden sm:inline">New</span>
          </button>

          <div className="w-px h-6 bg-[var(--border)]" />

          <FileText size={20} className="text-[var(--muted)] flex-shrink-0" />
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              setHasUnsavedChanges(true)
            }}
            placeholder="Untitled Note"
            className="flex-1 text-lg font-semibold bg-transparent border-none outline-none placeholder:text-[var(--muted)]"
          />
          <div className="flex items-center gap-3">
            {editingFile && (
              <span className="text-xs text-[var(--muted)] bg-[var(--card)] px-2 py-1 rounded">
                Editing
              </span>
            )}
            {lastSaved && !hasUnsavedChanges && (
              <span className="text-xs text-[var(--muted)]">
                Saved {lastSaved.toLocaleTimeString()}
              </span>
            )}
            {hasUnsavedChanges && (
              <span className="text-xs text-amber-400">Unsaved changes</span>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                bg-[var(--accent)] text-[var(--background)]
                hover:opacity-90 disabled:opacity-50
                transition-opacity
              "
            >
              {isSaving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Formatting Toolbar */}
      <div className="border-b border-[var(--border)] bg-[var(--card)]">
        <div className="max-w-4xl mx-auto px-4 py-2 flex items-center gap-1 flex-wrap">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-2 rounded hover:bg-[var(--border)] transition-colors ${
              editor.isActive('bold') ? 'bg-[var(--border)] text-[var(--accent)]' : ''
            }`}
            title="Bold (Cmd+B)"
          >
            <Bold size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-2 rounded hover:bg-[var(--border)] transition-colors ${
              editor.isActive('italic') ? 'bg-[var(--border)] text-[var(--accent)]' : ''
            }`}
            title="Italic (Cmd+I)"
          >
            <Italic size={16} />
          </button>

          <div className="w-px h-5 bg-[var(--border)] mx-1" />

          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`p-2 rounded hover:bg-[var(--border)] transition-colors ${
              editor.isActive('heading', { level: 1 }) ? 'bg-[var(--border)] text-[var(--accent)]' : ''
            }`}
            title="Heading 1"
          >
            <Heading1 size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-2 rounded hover:bg-[var(--border)] transition-colors ${
              editor.isActive('heading', { level: 2 }) ? 'bg-[var(--border)] text-[var(--accent)]' : ''
            }`}
            title="Heading 2"
          >
            <Heading2 size={16} />
          </button>

          <div className="w-px h-5 bg-[var(--border)] mx-1" />

          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-2 rounded hover:bg-[var(--border)] transition-colors ${
              editor.isActive('bulletList') ? 'bg-[var(--border)] text-[var(--accent)]' : ''
            }`}
            title="Bullet List"
          >
            <List size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-2 rounded hover:bg-[var(--border)] transition-colors ${
              editor.isActive('orderedList') ? 'bg-[var(--border)] text-[var(--accent)]' : ''
            }`}
            title="Numbered List"
          >
            <ListOrdered size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`p-2 rounded hover:bg-[var(--border)] transition-colors ${
              editor.isActive('blockquote') ? 'bg-[var(--border)] text-[var(--accent)]' : ''
            }`}
            title="Quote"
          >
            <Quote size={16} />
          </button>

          <div className="w-px h-5 bg-[var(--border)] mx-1" />

          <button
            onClick={addLink}
            className={`p-2 rounded hover:bg-[var(--border)] transition-colors ${
              editor.isActive('link') ? 'bg-[var(--border)] text-[var(--accent)]' : ''
            }`}
            title="Add Link"
          >
            <LinkIcon size={16} />
          </button>
          <button
            onClick={() => imageInputRef.current?.click()}
            disabled={isUploadingImage}
            className="p-2 rounded hover:bg-[var(--border)] transition-colors disabled:opacity-50"
            title="Insert Image"
          >
            {isUploadingImage ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
          </button>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={handleImageUpload}
          />

          <div className="flex-1" />

          <button
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="p-2 rounded hover:bg-[var(--border)] transition-colors disabled:opacity-30"
            title="Undo (Cmd+Z)"
          >
            <Undo size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="p-2 rounded hover:bg-[var(--border)] transition-colors disabled:opacity-30"
            title="Redo (Cmd+Shift+Z)"
          >
            <Redo size={16} />
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto bg-[var(--background)]">
        <div className="max-w-4xl mx-auto">
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Tips */}
      <div className="border-t border-[var(--border)] bg-[var(--card)] px-4 py-2">
        <p className="text-xs text-[var(--muted)] text-center">
          Tip: Press Cmd/Ctrl+S to save. Your notes can be used as source material for generating posts.
        </p>
      </div>
    </div>
  )
}
