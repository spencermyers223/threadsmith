'use client'

interface ProfileHeaderProps {
  size?: 'sm' | 'md' | 'lg'
  showNumber?: number
  className?: string
  name?: string
  handle?: string
  avatarUrl?: string
}

export function ProfileHeader({ 
  size = 'md', 
  showNumber, 
  className = '',
  name = 'Your Name',
  handle = 'yourhandle',
  avatarUrl
}: ProfileHeaderProps) {
  const avatarSizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  }

  const textSizes = {
    sm: { name: 'text-sm', handle: 'text-xs' },
    md: { name: 'text-base', handle: 'text-sm' },
    lg: { name: 'text-lg', handle: 'text-sm' },
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {avatarUrl ? (
        <img 
          src={avatarUrl} 
          alt={name}
          className={`${avatarSizes[size]} rounded-full flex-shrink-0 object-cover`}
        />
      ) : (
        <div className={`${avatarSizes[size]} rounded-full bg-accent flex-shrink-0 flex items-center justify-center`}>
          {showNumber !== undefined ? (
            <span className="text-white font-bold text-sm">{showNumber}</span>
          ) : (
            <span className="text-white font-bold text-sm">{name.charAt(0).toUpperCase()}</span>
          )}
        </div>
      )}
      <div className="min-w-0">
        <div className={`font-bold ${textSizes[size].name} leading-tight`}>{name}</div>
        <div className={`text-[var(--muted)] ${textSizes[size].handle} leading-tight`}>@{handle.replace('@', '')}</div>
      </div>
    </div>
  )
}
