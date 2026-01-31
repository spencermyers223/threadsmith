'use client'

import { useState, useCallback, KeyboardEvent } from 'react'
import { AtSign, Plus, Users, ExternalLink, Trash2, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import Image from 'next/image'

interface FetchedUser {
  id: string
  name: string
  username: string
  profile_image_url?: string
  followers_count: number
}

interface FetchedTweet {
  id: string
  text: string
  url: string
  metrics: {
    like_count: number
    retweet_count: number
    reply_count: number
  }
}

interface AdmiredAccountData {
  username: string
  user?: FetchedUser
  status: 'pending' | 'fetching' | 'saving' | 'done' | 'error'
  error?: string
  savedCount?: number
}

interface AdmiredAccountsManagerProps {
  accounts: string[]
  onAccountsChange: (accounts: string[]) => void
  onSaveInspirationTweets: (username: string, user: FetchedUser, tweets: FetchedTweet[]) => Promise<number>
}

const MAX_ACCOUNTS = 5
const TWEETS_TO_SAVE = 10 // Save top 10 tweets from each account

export default function AdmiredAccountsManager({
  accounts,
  onAccountsChange,
  onSaveInspirationTweets,
}: AdmiredAccountsManagerProps) {
  const [inputValue, setInputValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [accountData, setAccountData] = useState<Record<string, AdmiredAccountData>>({})

  const fetchAndSaveTweets = useCallback(async (username: string) => {
    // Update status to fetching
    setAccountData(prev => ({
      ...prev,
      [username]: { username, status: 'fetching' }
    }))

    try {
      // Fetch tweets from X API
      const response = await fetch(`/api/x/user-tweets?username=${username}&max_results=50`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch tweets')
      }

      if (!data.tweets || data.tweets.length === 0) {
        throw new Error('No tweets found for this account')
      }

      // Update status to saving
      setAccountData(prev => ({
        ...prev,
        [username]: { 
          username, 
          user: data.user,
          status: 'saving' 
        }
      }))

      // Take top tweets by engagement and save them
      const topTweets = data.tweets.slice(0, TWEETS_TO_SAVE)
      const savedCount = await onSaveInspirationTweets(username, data.user, topTweets)

      // Update status to done
      setAccountData(prev => ({
        ...prev,
        [username]: { 
          username, 
          user: data.user,
          status: 'done',
          savedCount
        }
      }))

    } catch (err) {
      setAccountData(prev => ({
        ...prev,
        [username]: { 
          username, 
          status: 'error',
          error: err instanceof Error ? err.message : 'Failed to fetch tweets'
        }
      }))
    }
  }, [onSaveInspirationTweets])

  const handleAdd = useCallback(async () => {
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

    setError(null)
    setInputValue('')
    
    // Add to accounts list
    onAccountsChange([...accounts, handle])
    
    // Fetch and save their tweets
    fetchAndSaveTweets(handle)
  }, [inputValue, accounts, onAccountsChange, fetchAndSaveTweets])

  const handleRemove = useCallback((account: string) => {
    onAccountsChange(accounts.filter(a => a !== account))
    setAccountData(prev => {
      const newData = { ...prev }
      delete newData[account]
      return newData
    })
  }, [accounts, onAccountsChange])

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  const handleRetry = (username: string) => {
    fetchAndSaveTweets(username)
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
          Add X accounts whose style you want to emulate. We&apos;ll automatically save their best tweets as inspiration.
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

      {/* Account List */}
      {accounts.length > 0 && (
        <div className="space-y-2">
          {accounts.map((username) => {
            const data = accountData[username]
            const status = data?.status || 'pending'
            
            return (
              <div 
                key={username} 
                className="flex items-center justify-between px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {/* Profile image or placeholder */}
                  {data?.user?.profile_image_url ? (
                    <Image
                      src={data.user.profile_image_url}
                      alt=""
                      width={32}
                      height={32}
                      className="w-8 h-8 rounded-full"
                      unoptimized
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[var(--border)] flex items-center justify-center">
                      <AtSign className="w-4 h-4 text-[var(--muted)]" />
                    </div>
                  )}
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {data?.user?.name || `@${username}`}
                      </span>
                      {data?.user?.name && (
                        <span className="text-xs text-[var(--muted)]">@{username}</span>
                      )}
                      <a
                        href={`https://x.com/${username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--muted)] hover:text-accent"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    
                    {/* Status line */}
                    <div className="text-xs mt-0.5">
                      {status === 'fetching' && (
                        <span className="text-blue-400 flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Fetching tweets...
                        </span>
                      )}
                      {status === 'saving' && (
                        <span className="text-blue-400 flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Saving inspiration...
                        </span>
                      )}
                      {status === 'done' && (
                        <span className="text-green-400 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Saved {data?.savedCount || 0} tweets
                        </span>
                      )}
                      {status === 'error' && (
                        <span className="text-red-400 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {data?.error || 'Failed'}
                          <button
                            onClick={() => handleRetry(username)}
                            className="ml-1 underline hover:no-underline"
                          >
                            Retry
                          </button>
                        </span>
                      )}
                      {status === 'pending' && (
                        <span className="text-[var(--muted)]">
                          Waiting...
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleRemove(username)}
                  className="p-1.5 rounded hover:bg-red-500/20 text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Account Count */}
      <p className="text-xs text-[var(--muted)]">
        {accounts.length}/{MAX_ACCOUNTS} accounts • Top {TWEETS_TO_SAVE} tweets auto-saved from each
      </p>
    </div>
  )
}
