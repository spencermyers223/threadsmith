'use client'

import { useState, useEffect, useRef } from 'react'
import { Filter, Check, X } from 'lucide-react'
import TagBadge, { Tag } from './TagBadge'

interface TagFilterProps {
  selectedTagIds: string[]
  onChange: (tagIds: string[]) => void
  availableTags: Tag[]
}

export default function TagFilter({
  selectedTagIds,
  onChange,
  availableTags,
}: TagFilterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
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

  const handleClearAll = () => {
    onChange([])
    setIsOpen(false)
  }

  const selectedTags = availableTags.filter(tag => selectedTagIds.includes(tag.id))
  const hasFilters = selectedTagIds.length > 0

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Filter button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
          border transition-colors duration-150
          ${hasFilters
            ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
            : 'border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--accent)]/50'
          }
        `}
      >
        <Filter size={16} />
        <span>
          {hasFilters ? `${selectedTagIds.length} tag${selectedTagIds.length > 1 ? 's' : ''}` : 'Filter by tag'}
        </span>
        {hasFilters && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handleClearAll()
            }}
            className="hover:text-[var(--foreground)] transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="
          absolute z-20 top-full right-0 mt-1 min-w-48
          bg-[var(--card)] border border-[var(--border)] rounded-lg
          shadow-lg overflow-hidden
        ">
          {availableTags.length === 0 ? (
            <div className="px-3 py-4 text-sm text-[var(--muted)] text-center">
              No tags available
            </div>
          ) : (
            <>
              <div className="max-h-64 overflow-y-auto">
                {availableTags.map((tag) => {
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
                })}
              </div>

              {hasFilters && (
                <>
                  <div className="border-t border-[var(--border)]" />
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="
                      w-full px-3 py-2 text-sm text-[var(--muted)]
                      hover:bg-[var(--background)] hover:text-[var(--foreground)]
                      transition-colors duration-150
                    "
                  >
                    Clear all filters
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* Active filters display (horizontal inline badges) */}
      {hasFilters && selectedTags.length > 0 && (
        <div className="absolute top-full left-0 mt-2 flex flex-wrap gap-1.5">
          {selectedTags.map((tag) => (
            <TagBadge
              key={tag.id}
              tag={tag}
              size="sm"
              onRemove={() => handleToggleTag(tag.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
