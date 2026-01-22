'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronDown, Check, Plus, X, Loader2 } from 'lucide-react'
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

interface TagSelectorProps {
  selectedTagIds: string[]
  onChange: (tagIds: string[]) => void
}

export default function TagSelector({ selectedTagIds, onChange }: TagSelectorProps) {
  const [tags, setTags] = useState<Tag[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [isCreateMode, setIsCreateMode] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState(COLOR_PRESETS[0].value)
  const [isCreating, setIsCreating] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const fetchTags = useCallback(async () => {
    try {
      const response = await fetch('/api/tags')
      if (!response.ok) throw new Error('Failed to fetch tags')
      const data = await response.json()
      setTags(data.tags || [])
    } catch {
      console.error('Failed to load tags')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTags()
  }, [fetchTags])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setIsCreateMode(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleToggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter(id => id !== tagId))
    } else {
      onChange([...selectedTagIds, tagId])
    }
  }

  const handleRemoveTag = (tagId: string) => {
    onChange(selectedTagIds.filter(id => id !== tagId))
  }

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return

    setIsCreating(true)
    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTagName.trim(), color: newTagColor }),
      })

      if (!response.ok) throw new Error('Failed to create tag')

      const data = await response.json()
      setTags([...tags, data.tag])
      onChange([...selectedTagIds, data.tag.id])
      setNewTagName('')
      setNewTagColor(COLOR_PRESETS[0].value)
      setIsCreateMode(false)
    } catch {
      console.error('Failed to create tag')
    } finally {
      setIsCreating(false)
    }
  }

  const selectedTags = tags.filter(tag => selectedTagIds.includes(tag.id))

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-[var(--foreground)]">
        Tags
      </label>

      <div className="relative" ref={dropdownRef}>
        {/* Dropdown trigger */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="
            w-full flex items-center justify-between px-3 py-2 rounded-lg
            bg-[var(--card)] border border-[var(--border)]
            text-[var(--foreground)] text-sm text-left
            hover:border-[var(--accent)]/50 transition-colors duration-150
          "
        >
          <span className={selectedTagIds.length === 0 ? 'text-[var(--muted)]' : ''}>
            {selectedTagIds.length === 0
              ? 'Select tags...'
              : `${selectedTagIds.length} tag${selectedTagIds.length > 1 ? 's' : ''} selected`
            }
          </span>
          <ChevronDown
            size={16}
            className={`text-[var(--muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Dropdown menu */}
        {isOpen && (
          <div className="
            absolute z-20 top-full left-0 right-0 mt-1
            bg-[var(--card)] border border-[var(--border)] rounded-lg
            shadow-lg overflow-hidden
          ">
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 size={18} className="animate-spin text-[var(--muted)]" />
              </div>
            ) : (
              <>
                {/* Tag list */}
                <div className="max-h-48 overflow-y-auto">
                  {tags.length === 0 ? (
                    <div className="px-3 py-4 text-sm text-[var(--muted)] text-center">
                      No tags yet
                    </div>
                  ) : (
                    tags.map((tag) => {
                      const isSelected = selectedTagIds.includes(tag.id)
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => handleToggleTag(tag.id)}
                          className="
                            w-full flex items-center gap-3 px-3 py-2
                            hover:bg-[var(--background)] transition-colors duration-150
                          "
                        >
                          <div className={`
                            w-4 h-4 rounded border flex items-center justify-center
                            ${isSelected
                              ? 'bg-[var(--accent)] border-[var(--accent)]'
                              : 'border-[var(--border)]'
                            }
                          `}>
                            {isSelected && <Check size={12} className="text-[var(--background)]" />}
                          </div>
                          <TagBadge tag={tag} size="sm" />
                        </button>
                      )
                    })
                  )}
                </div>

                {/* Divider */}
                <div className="border-t border-[var(--border)]" />

                {/* Create new tag section */}
                {isCreateMode ? (
                  <div className="p-3 space-y-3">
                    <input
                      type="text"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      placeholder="Tag name"
                      maxLength={30}
                      autoFocus
                      className="
                        w-full px-3 py-1.5 rounded text-sm
                        bg-[var(--background)] border border-[var(--border)]
                        text-[var(--foreground)] placeholder-[var(--muted)]
                        focus:outline-none focus:border-[var(--accent)]
                      "
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleCreateTag()
                        }
                        if (e.key === 'Escape') {
                          setIsCreateMode(false)
                        }
                      }}
                    />
                    <div className="flex gap-1.5">
                      {COLOR_PRESETS.map((preset) => (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => setNewTagColor(preset.value)}
                          className={`
                            w-5 h-5 rounded-full transition-all
                            ${newTagColor === preset.value
                              ? 'ring-2 ring-offset-1 ring-offset-[var(--card)] ring-[var(--accent)]'
                              : ''
                            }
                          `}
                          style={{ backgroundColor: preset.value }}
                        />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setIsCreateMode(false)}
                        className="
                          flex-1 px-2 py-1 rounded text-xs font-medium
                          border border-[var(--border)] text-[var(--foreground)]
                          hover:bg-[var(--background)]
                        "
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleCreateTag}
                        disabled={!newTagName.trim() || isCreating}
                        className="
                          flex-1 px-2 py-1 rounded text-xs font-medium
                          bg-[var(--accent)] text-[var(--background)]
                          hover:opacity-90 disabled:opacity-50
                          flex items-center justify-center gap-1
                        "
                      >
                        {isCreating ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          'Create'
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsCreateMode(true)}
                    className="
                      w-full flex items-center gap-2 px-3 py-2
                      text-sm text-[var(--accent)]
                      hover:bg-[var(--background)] transition-colors duration-150
                    "
                  >
                    <Plus size={16} />
                    Create new tag
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Selected tags display */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tag) => (
            <TagBadge
              key={tag.id}
              tag={tag}
              size="sm"
              onRemove={() => handleRemoveTag(tag.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
