'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Save, Loader2, Bold, Italic, List, ListOrdered, Link as LinkIcon,
  Heading1, Heading2, Quote, Undo, Redo, FileText
} from 'lucide-react'
import type { FileRecord } from '@/components/generate/FilesSidebar'

interface WriteModeProps {
  editingFile: FileRecord | null
  onFileSaved: (file: FileRecord) => void
  onCreateNew: () => void
}

export default function WriteMode({ editingFile, onFileSaved, onCreateNew }: WriteModeProps) {
  const [title, setTitle] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const supabase = createClient()

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
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none min-h-[400px] p-4',
      },
    },
    onUpdate: () => {
      setHasUnsavedChanges(true)
    },
  })

  // Load file content when editingFile changes
  useEffect(() => {
    if (editingFile) {
      setTitle(editingFile.name || '')
      // Content is stored as plain text or markdown
      const content = editingFile.content || ''
      editor?.commands.setContent(content ? `<p>${content.replace(/\n/g, '</p><p>')}</p>` : '')
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

      // Get plain text content
      const content = editor.getText()

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

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--muted)]" />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Title and Save Bar */}
      <div className="border-b border-[var(--border)] bg-[var(--background)]">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
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
              disabled={isSaving || !hasUnsavedChanges}
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
