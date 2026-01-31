'use client'

import { useState, useCallback, KeyboardEvent } from 'react'
import { AtSign, Plus, Users, ExternalLink, Trash2, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'

interface AdmiredAccountsManagerProps {
  accounts: string[]
  onAccountsChange: (accounts: string[]) => void
  onImportTweets: (username: string, tweets: string[]) => Promise<unknown>
}

const MAX_ACCOUNTS = 5

export default function AdmiredAccountsManager({
  accounts,
  onAccountsChange,
  onImportTweets,
}: AdmiredAccountsManagerProps) {
  const [inputValue, setInputValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null)
  const [tweetInput, setTweetInput] = useState('')
  const [importing, setImporting] = useState(false)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)

  const handleAdd = useCallback(() => {
    const handle = inputValue.trim().replace(/^@/, '')

    if (!handle) return

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

    onAccountsChange([...accounts, handle])
    setInputValue('')
    setError(null)
  }, [inputValue, accounts, onAccountsChange])

  const handleRemove = useCallback((account: string) => {
    onAccountsChange(accounts.filter(a => a !== account))
    if (expandedAccount === account) {
      setExpandedAccount(null)
    }
  }, [accounts, onAccountsChange, expandedAccount])

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  const handleImportTweets = async (username: string) => {
    if (!tweetInput.trim()) return
    
    setImporting(true)
    setError(null)
    
    // Split tweets by double newlines or numbered patterns
    const tweets = tweetInput
      .split(/\n\n+|\n(?=\d+[\.\)]\s)/)
      .map(t => t.replace(/^\d+[\.\)]\s*/, '').trim()) // Remove numbering
      .filter(t => t.length > 0 && t.length <= 500)
    
    if (tweets.length === 0) {
      setError('No valid tweets found. Paste tweet text, separated by blank lines.')
      setImporting(false)
      return
    }
    
    try {
      await onImportTweets(username, tweets)
      setTweetInput('')
      setImportSuccess(`Saved ${tweets.length} tweet(s) from @${username}`)
      setTimeout(() => setImportSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save tweets')
    }
    setImporting(false)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="font-semibold flex items-center gap-2">
          <Users className="w-4 h-4 text-violet-500" />
          Accounts You Admire
        </h3>
        <p className="text-xs text-[var(--muted)] mt-1">
          Add accounts whose style you want to emulate. Save their best tweets as inspiration.
        </p>
      </div>

      {/* Add Account Input */}
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
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:border-accent transition-colors disabled:opacity-50"
          />
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={accounts.length >= MAX_ACCOUNTS || !inputValue.trim()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm bg-accent text-[var(--accent-text)] hover:bg-accent-hover transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      {importSuccess && (
        <p className="text-xs text-green-500 flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          {importSuccess}
        </p>
      )}

      {/* Account List */}
      {accounts.length > 0 && (
        <div className="space-y-2">
          {accounts.map((account) => (
            <div 
              key={account} 
              className="border border-[var(--border)] rounded-lg overflow-hidden"
            >
              {/* Account Header */}
              <div 
                className="flex items-center justify-between px-3 py-2 bg-[var(--background)] cursor-pointer hover:bg-[var(--card-hover)]"
                onClick={() => setExpandedAccount(expandedAccount === account ? null : account)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">@{account}</span>
                  <a
                    href={`https://x.com/${account}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-[var(--muted)] hover:text-accent"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemove(account) }}
                    className="p-1 rounded hover:bg-red-500/20 text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  {expandedAccount === account ? (
                    <ChevronUp className="w-4 h-4 text-[var(--muted)]" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[var(--muted)]" />
                  )}
                </div>
              </div>

              {/* Expanded: Import Tweets */}
              {expandedAccount === account && (
                <div className="border-t border-[var(--border)] p-3 space-y-3">
                  <div>
                    <p className="text-xs text-[var(--muted)] mb-2">
                      Paste tweets from @{account} that you admire. Separate with blank lines.
                    </p>
                    <textarea
                      value={tweetInput}
                      onChange={(e) => setTweetInput(e.target.value)}
                      placeholder={`Paste @${account}'s best tweets here...\n\nEach tweet on its own line or separated by blank lines.`}
                      rows={4}
                      className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-[var(--foreground)] placeholder-[var(--muted)] text-sm focus:outline-none focus:border-accent resize-none"
                    />
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-[var(--muted)]">
                        {tweetInput.split(/\n\n+|\n(?=\d+[\.\)]\s)/).filter(t => t.trim()).length} tweets detected
                      </span>
                      <button
                        onClick={() => handleImportTweets(account)}
                        disabled={importing || !tweetInput.trim()}
                        className="flex items-center gap-2 px-3 py-1.5 bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white rounded-lg transition-colors text-xs font-medium"
                      >
                        {importing ? (
                          <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Plus className="w-3 h-3" />
                        )}
                        Save as Inspiration
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-xs text-[var(--muted)] bg-violet-500/5 p-2 rounded border border-violet-500/20">
                    💡 <strong>Tip:</strong> Use the Chrome extension to save tweets directly while browsing X. 
                    Look for the &ldquo;Save to xthread&rdquo; button.
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Account Count */}
      <p className="text-xs text-[var(--muted)]">
        {accounts.length}/{MAX_ACCOUNTS} accounts added
      </p>
    </div>
  )
}
