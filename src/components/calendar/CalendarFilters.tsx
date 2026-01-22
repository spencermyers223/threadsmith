'use client'

import { useState, useRef, useEffect } from 'react'
import { Filter, Check, X, ChevronDown, Eye, MessageCircle, Rocket } from 'lucide-react'
import { TagFilter } from '@/components/tags'
import type { Tag } from '@/components/tags'
import type { GenerationType } from './PostTypeIcon'

export interface CalendarFilterState {
  postTypes: GenerationType[]
  tagIds: string[]
}

interface CalendarFiltersProps {
  filters: CalendarFilterState
  onChange: (filters: CalendarFilterState) => void
  availableTags: Tag[]
}

const postTypeOptions: {
  id: GenerationType
  label: string
  icon: typeof Eye
  color: string
}[] = [
  { id: 'scroll_stopper', label: 'Scroll Stopper', icon: Eye, color: 'text-amber-400' },
  { id: 'debate_starter', label: 'Debate Starter', icon: MessageCircle, color: 'text-blue-400' },
  { id: 'viral_catalyst', label: 'Viral Catalyst', icon: Rocket, color: 'text-green-400' },
]

export default function CalendarFilters({
  filters,
  onChange,
  availableTags,
}: CalendarFiltersProps) {
  const [isPostTypeOpen, setIsPostTypeOpen] = useState(false)
  const postTypeRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (postTypeRef.current && !postTypeRef.current.contains(event.target as Node)) {
        setIsPostTypeOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleTogglePostType = (typeId: GenerationType) => {
    const newTypes = filters.postTypes.includes(typeId)
      ? filters.postTypes.filter(t => t !== typeId)
      : [...filters.postTypes, typeId]

    onChange({ ...filters, postTypes: newTypes })
  }

  const handleTagsChange = (tagIds: string[]) => {
    onChange({ ...filters, tagIds })
  }

  const handleClearAll = () => {
    onChange({ postTypes: [], tagIds: [] })
  }

  const totalActiveFilters = filters.postTypes.length + filters.tagIds.length
  const hasFilters = totalActiveFilters > 0

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Post Type Filter */}
      <div className="relative" ref={postTypeRef}>
        <button
          type="button"
          onClick={() => setIsPostTypeOpen(!isPostTypeOpen)}
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
            border transition-colors duration-150
            ${filters.postTypes.length > 0
              ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
              : 'border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--accent)]/50'
            }
          `}
        >
          <Filter size={16} />
          <span>
            {filters.postTypes.length > 0
              ? `${filters.postTypes.length} type${filters.postTypes.length > 1 ? 's' : ''}`
              : 'Post type'
            }
          </span>
          <ChevronDown
            size={14}
            className={`transition-transform ${isPostTypeOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {isPostTypeOpen && (
          <div className="
            absolute z-20 top-full left-0 mt-1 min-w-48
            bg-[var(--card)] border border-[var(--border)] rounded-lg
            shadow-lg overflow-hidden
          ">
            {postTypeOptions.map((option) => {
              const Icon = option.icon
              const isSelected = filters.postTypes.includes(option.id)

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleTogglePostType(option.id)}
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
                  <Icon size={16} className={option.color} />
                  <span className="text-sm text-[var(--foreground)]">
                    {option.label}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Tag Filter */}
      <TagFilter
        selectedTagIds={filters.tagIds}
        onChange={handleTagsChange}
        availableTags={availableTags}
      />

      {/* Active filters count badge */}
      {hasFilters && (
        <div className="flex items-center gap-2">
          <span className="
            inline-flex items-center justify-center px-2 py-0.5 rounded-full
            text-xs font-medium bg-[var(--accent)] text-[var(--background)]
          ">
            {totalActiveFilters} active
          </span>

          <button
            type="button"
            onClick={handleClearAll}
            className="
              flex items-center gap-1 px-2 py-1 rounded text-xs
              text-[var(--muted)] hover:text-[var(--foreground)]
              transition-colors duration-150
            "
          >
            <X size={12} />
            Clear all
          </button>
        </div>
      )}
    </div>
  )
}
