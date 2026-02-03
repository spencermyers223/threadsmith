'use client'

import Link from 'next/link'
import { AccountSwitcher } from '@/components/account-switcher'

export function Header() {

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
          href="/drafts"
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
          href="/customization"
          className="px-3 py-1.5 text-sm rounded-md hover:bg-[var(--card)] transition-colors"
        >
          Customization
        </Link>
      </nav>

      <div className="flex items-center">
        <AccountSwitcher />
      </div>
    </header>
  )
}
