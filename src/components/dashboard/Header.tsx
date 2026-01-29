'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Settings, LogOut } from 'lucide-react'
import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { AccountSwitcher } from '@/components/account-switcher'

interface HeaderProps {
  user: User
}

export function Header({ user }: HeaderProps) {
  const router = useRouter()
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  
  // Get X profile info from user metadata
  const xUsername = user.user_metadata?.x_username || user.user_metadata?.username
  const xName = user.user_metadata?.name || user.user_metadata?.full_name
  const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture
  const displayName = xUsername ? `@${xUsername}` : (xName || user.email?.split('@')[0])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="h-14 border-b border-[var(--border)] flex items-center justify-between px-4">
      <Link href="/creator-hub" className="flex items-center">
        <span className="text-xl font-bold text-sand">xthread</span>
      </Link>

      <nav className="flex items-center gap-2">
        <Link
          href="/creator-hub"
          className="px-3 py-1.5 text-sm rounded-md hover:bg-[var(--card)] transition-colors"
        >
          Creator Hub
        </Link>
        <Link
          href="/workspace"
          className="px-3 py-1.5 text-sm rounded-md hover:bg-[var(--card)] transition-colors"
        >
          Workspace
        </Link>
        <Link
          href="/calendar"
          className="px-3 py-1.5 text-sm rounded-md hover:bg-[var(--card)] transition-colors"
        >
          Calendar
        </Link>
        <Link
          href="/analytics"
          className="px-3 py-1.5 text-sm rounded-md hover:bg-[var(--card)] transition-colors"
        >
          Analytics
        </Link>
        <Link
          href="/settings"
          className="px-3 py-1.5 text-sm rounded-md hover:bg-[var(--card)] transition-colors"
        >
          Settings
        </Link>
      </nav>

      <div className="flex items-center gap-3">
        <AccountSwitcher />
        
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-[var(--card)] transition-colors"
          >
          {avatarUrl ? (
            <img 
              src={avatarUrl} 
              alt={displayName}
              className="w-7 h-7 rounded-full object-cover"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center text-[var(--accent-text)] text-sm font-medium">
              {displayName[0]?.toUpperCase()}
            </div>
          )}
        </button>

        {showMenu && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-lg py-1 z-50">
            <div className="px-4 py-2 border-b border-[var(--border)]">
              <p className="text-sm font-medium truncate">{displayName}</p>
              {xName && xUsername && (
                <p className="text-xs text-[var(--muted)] truncate">{xName}</p>
              )}
            </div>
            <Link
              href="/settings"
              className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-[var(--border)] transition-colors"
              onClick={() => setShowMenu(false)}
            >
              <Settings className="w-4 h-4" />
              Settings
            </Link>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-[var(--border)] transition-colors text-red-400"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
          )}
        </div>
      </div>
    </header>
  )
}
