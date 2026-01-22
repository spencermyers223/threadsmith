'use client'

import { useState, KeyboardEvent } from 'react'
import { X, AtSign } from 'lucide-react'

interface AdmiredAccountsInputProps {
  accounts: string[]
  onAdd: (account: string) => void
  onRemove: (account: string) => void
}

const MAX_ACCOUNTS = 5

export default function AdmiredAccountsInput({
  accounts,
  onAdd,
  onRemove,
}: AdmiredAccountsInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleAdd = () => {
    const handle = inputValue.trim().replace(/^@/, '')

    if (!handle) {
      return
    }

    if (accounts.length >= MAX_ACCOUNTS) {
      setError(`Maximum ${MAX_ACCOUNTS} accounts allowed`)
      return
    }

    if (accounts.includes(handle)) {
      setError('Account already added')
      return
    }

    // Basic validation for X handle format
    if (!/^[a-zA-Z0-9_]{1,15}$/.test(handle)) {
      setError('Invalid handle format')
      return
    }

    onAdd(handle)
    setInputValue('')
    setError(null)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-[var(--foreground)]">
        Accounts you admire (optional)
      </label>
      <p className="text-xs text-[var(--muted)]">
        Add up to {MAX_ACCOUNTS} X accounts whose style you want to emulate
      </p>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">
            <AtSign size={16} strokeWidth={1.5} />
          </div>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value)
              setError(null)
            }}
            onKeyDown={handleKeyDown}
            placeholder="username"
            disabled={accounts.length >= MAX_ACCOUNTS}
            className={`
              w-full pl-9 pr-4 py-2 rounded-lg
              bg-[var(--card)] border border-[var(--border)]
              text-[var(--foreground)] placeholder-[var(--muted)]
              focus:outline-none focus:border-[var(--accent)]
              transition-colors duration-150
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          />
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={accounts.length >= MAX_ACCOUNTS || !inputValue.trim()}
          className={`
            px-4 py-2 rounded-lg font-medium text-sm
            bg-[var(--accent)] text-[var(--background)]
            hover:opacity-90 transition-opacity duration-150
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          Add
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      {accounts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {accounts.map((account) => (
            <span
              key={account}
              className="
                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
                bg-[var(--accent)]/10 text-[var(--accent)] text-sm
              "
            >
              @{account}
              <button
                type="button"
                onClick={() => onRemove(account)}
                className="hover:text-red-400 transition-colors duration-150"
              >
                <X size={14} strokeWidth={2} />
              </button>
            </span>
          ))}
        </div>
      )}

      <p className="text-xs text-[var(--muted)]">
        {accounts.length}/{MAX_ACCOUNTS} accounts added
      </p>
    </div>
  )
}
