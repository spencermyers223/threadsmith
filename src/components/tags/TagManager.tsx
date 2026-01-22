'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, X, Loader2 } from 'lucide-react'
import TagBadge, { Tag } from './TagBadge'

const COLOR_PRESETS = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Green', value: '#22C55E' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Yellow', value: '#EAB308' },
  { name: 'Gray', value: '#6B7280' },
]

interface TagModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (name: string, color: string) => Promise<void>
  initialName?: string
  initialColor?: string
  title: string
}

function TagModal({
  isOpen,
  onClose,
  onSave,
  initialName = '',
  initialColor = COLOR_PRESETS[0].value,
  title,
}: TagModalProps) {
  const [name, setName] = useState(initialName)
  const [color, setColor] = useState(initialColor)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setName(initialName)
    setColor(initialColor)
    setError(null)
  }, [initialName, initialColor, isOpen])

  if (!isOpen) return null

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Tag name is required')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      await onSave(name.trim(), color)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save tag')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div className="relative bg-[var(--card)] border border-[var(--border)] rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[var(--foreground)]">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Tag Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Crypto, Marketing"
              maxLength={30}
              className="
                w-full px-3 py-2 rounded-lg
                bg-[var(--background)] border border-[var(--border)]
                text-[var(--foreground)] placeholder-[var(--muted)]
                focus:outline-none focus:border-[var(--accent)]
                transition-colors duration-150
              "
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setColor(preset.value)}
                  className={`
                    w-8 h-8 rounded-full transition-all duration-150
                    ${color === preset.value
                      ? 'ring-2 ring-offset-2 ring-offset-[var(--card)] ring-[var(--accent)]'
                      : 'hover:scale-110'
                    }
                  `}
                  style={{ backgroundColor: preset.value }}
                  title={preset.name}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Preview
            </label>
            <TagBadge tag={{ id: 'preview', name: name || 'Tag Name', color }} />
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="
              px-4 py-2 rounded-lg text-sm font-medium
              border border-[var(--border)] text-[var(--foreground)]
              hover:bg-[var(--background)] transition-colors duration-150
            "
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="
              px-4 py-2 rounded-lg text-sm font-medium
              bg-[var(--accent)] text-[var(--background)]
              hover:opacity-90 transition-opacity duration-150
              disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center gap-2
            "
          >
            {isSaving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

interface ConfirmDeleteModalProps {
  isOpen: boolean
  tagName: string
  onClose: () => void
  onConfirm: () => Promise<void>
}

function ConfirmDeleteModal({
  isOpen,
  tagName,
  onClose,
  onConfirm,
}: ConfirmDeleteModalProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  if (!isOpen) return null

  const handleConfirm = async () => {
    setIsDeleting(true)
    try {
      await onConfirm()
      onClose()
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div className="relative bg-[var(--card)] border border-[var(--border)] rounded-lg p-6 w-full max-w-sm mx-4">
        <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
          Delete Tag
        </h3>
        <p className="text-sm text-[var(--muted)] mb-6">
          Are you sure you want to delete &quot;{tagName}&quot;? This will remove the tag from all posts.
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="
              px-4 py-2 rounded-lg text-sm font-medium
              border border-[var(--border)] text-[var(--foreground)]
              hover:bg-[var(--background)] transition-colors duration-150
            "
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isDeleting}
            className="
              px-4 py-2 rounded-lg text-sm font-medium
              bg-red-500 text-white
              hover:bg-red-600 transition-colors duration-150
              disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center gap-2
            "
          >
            {isDeleting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TagManager() {
  const [tags, setTags] = useState<Tag[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [deletingTag, setDeletingTag] = useState<Tag | null>(null)

  const fetchTags = useCallback(async () => {
    try {
      const response = await fetch('/api/tags')
      if (!response.ok) throw new Error('Failed to fetch tags')
      const data = await response.json()
      setTags(data.tags || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tags')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTags()
  }, [fetchTags])

  const handleCreateTag = async (name: string, color: string) => {
    const response = await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color }),
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to create tag')
    }

    await fetchTags()
  }

  const handleUpdateTag = async (name: string, color: string) => {
    if (!editingTag) return

    const response = await fetch(`/api/tags/${editingTag.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color }),
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to update tag')
    }

    await fetchTags()
  }

  const handleDeleteTag = async () => {
    if (!deletingTag) return

    const response = await fetch(`/api/tags/${deletingTag.id}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to delete tag')
    }

    await fetchTags()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-[var(--muted)]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">
          Tags
        </h2>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="
            flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
            bg-[var(--accent)] text-[var(--background)]
            hover:opacity-90 transition-opacity duration-150
          "
        >
          <Plus size={16} />
          Create new tag
        </button>
      </div>

      {tags.length === 0 ? (
        <div className="text-center py-8 text-[var(--muted)]">
          <p>No tags yet. Create one to organize your content.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="
                flex items-center justify-between p-3 rounded-lg
                bg-[var(--card)] border border-[var(--border)]
              "
            >
              <TagBadge tag={tag} />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingTag(tag)}
                  className="
                    p-1.5 rounded text-[var(--muted)]
                    hover:text-[var(--foreground)] hover:bg-[var(--background)]
                    transition-colors duration-150
                  "
                  title="Edit tag"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => setDeletingTag(tag)}
                  className="
                    p-1.5 rounded text-[var(--muted)]
                    hover:text-red-400 hover:bg-red-500/10
                    transition-colors duration-150
                  "
                  title="Delete tag"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <TagModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateTag}
        title="Create New Tag"
      />

      {/* Edit Modal */}
      <TagModal
        isOpen={!!editingTag}
        onClose={() => setEditingTag(null)}
        onSave={handleUpdateTag}
        initialName={editingTag?.name}
        initialColor={editingTag?.color}
        title="Edit Tag"
      />

      {/* Delete Confirmation */}
      <ConfirmDeleteModal
        isOpen={!!deletingTag}
        tagName={deletingTag?.name || ''}
        onClose={() => setDeletingTag(null)}
        onConfirm={handleDeleteTag}
      />
    </div>
  )
}
