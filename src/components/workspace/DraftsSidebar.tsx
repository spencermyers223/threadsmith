'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { FileText, Trash2, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useXAccount } from '@/contexts/XAccountContext'

interface Draft {
  id: string
  title: string
  type: 'tweet' | 'thread' | 'article'
  content: { html: string }
  status: string
  updated_at: string
}

interface DraftsSidebarProps {
  currentDraftId: string | null
  onSelectDraft: (draft: Draft) => void
  onNewDraft: () => void
  refreshTrigger?: number
}

export function DraftsSidebar({ currentDraftId, onSelectDraft, onNewDraft, refreshTrigger }: DraftsSidebarProps) {
  const { activeAccount } = useXAccount()
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(false)
  const prevAccountIdRef = useRef<string | null>(null)

  const fetchDrafts = useCallback(async () => {
    if (!activeAccount?.id) return
    
    try {
      const res = await fetch(`/api/posts?status=draft&x_account_id=${activeAccount.id}`)
      if (res.ok) {
        const data = await res.json()
        setDrafts(data)
      }
    } catch (err) {
      console.error('Failed to fetch drafts:', err)
    }
    setLoading(false)
  }, [activeAccount?.id])

  // Reload when active account changes
  useEffect(() => {
    if (!activeAccount?.id) return
    if (prevAccountIdRef.current === activeAccount.id && drafts.length > 0) return
    prevAccountIdRef.current = activeAccount.id
    fetchDrafts()
  }, [fetchDrafts, activeAccount?.id, refreshTrigger, drafts.length])

  const handleDelete = async (draftId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Delete this draft?')) return

    try {
      const res = await fetch(`/api/posts/${draftId}`, { method: 'DELETE' })
      if (res.ok) {
        setDrafts(drafts.filter(d => d.id !== draftId))
      }
    } catch (err) {
      console.error('Failed to delete draft:', err)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'thread':
        return '🧵'
      case 'article':
        return '📝'
      default:
        return '💬'
    }
  }

  const getPreview = (draft: Draft) => {
    if (draft.title && draft.title !== `Untitled ${draft.type}`) {
      return draft.title
    }
    // Extract text preview from HTML content
    const text = draft.content?.html?.replace(/<[^>]*>/g, '') || ''
    return text.slice(0, 40) + (text.length > 40 ? '...' : '') || 'Empty draft'
  }

  if (collapsed) {
    return (
      <div className="w-12 border-l border-[var(--border)] flex flex-col items-center py-4 bg-[var(--background)]">
        <button
          onClick={() => setCollapsed(false)}
          className="p-2 rounded-md hover:bg-[var(--card)] transition-colors"
          title="Expand drafts"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <aside className="w-64 border-l border-[var(--border)] flex flex-col bg-[var(--background)]">
      <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
        <h2 className="font-semibold text-sm">Drafts</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={onNewDraft}
            className="p-1.5 rounded-md hover:bg-[var(--card)] transition-colors"
            title="New draft"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCollapsed(true)}
            className="p-1.5 rounded-md hover:bg-[var(--card)] transition-colors"
            title="Collapse"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : drafts.length === 0 ? (
          <div className="text-center py-8 text-sm text-[var(--muted)]">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No drafts yet</p>
            <button
              onClick={onNewDraft}
              className="mt-2 text-accent hover:underline"
            >
              Create your first draft
            </button>
          </div>
        ) : (
          <ul className="space-y-1">
            {drafts.map((draft) => (
              <li key={draft.id}>
                <button
                  onClick={() => onSelectDraft(draft)}
                  className={`w-full flex items-start gap-2 px-3 py-2 rounded-md transition-colors text-left group ${
                    currentDraftId === draft.id
                      ? 'bg-accent/20 text-accent'
                      : 'hover:bg-[var(--card)]'
                  }`}
                >
                  <span className="text-sm mt-0.5">{getTypeIcon(draft.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{getPreview(draft)}</div>
                    <div className="text-xs text-[var(--muted)]">
                      {formatDistanceToNow(new Date(draft.updated_at), { addSuffix: true })}
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(draft.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-red-400 transition-all flex-shrink-0"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  )
}
