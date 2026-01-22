'use client'

import { X } from 'lucide-react'

export interface Tag {
  id: string
  name: string
  color: string
}

interface TagBadgeProps {
  tag: Tag
  size?: 'sm' | 'md'
  onRemove?: () => void
}

// Determine if text should be light or dark based on background color
function getContrastColor(hexColor: string): string {
  // Remove # if present
  const hex = hexColor.replace('#', '')

  // Parse RGB values
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)

  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  // Return dark text for light backgrounds, light text for dark backgrounds
  return luminance > 0.5 ? '#18181B' : '#FFFFFF'
}

export default function TagBadge({ tag, size = 'md', onRemove }: TagBadgeProps) {
  const textColor = getContrastColor(tag.color)

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
  }

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full font-medium
        ${sizeClasses[size]}
      `}
      style={{
        backgroundColor: tag.color,
        color: textColor,
      }}
    >
      {tag.name}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="hover:opacity-70 transition-opacity"
          style={{ color: textColor }}
        >
          <X size={size === 'sm' ? 12 : 14} strokeWidth={2} />
        </button>
      )}
    </span>
  )
}
