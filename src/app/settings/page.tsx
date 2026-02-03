'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
// XAccountContext not needed in minimal settings - customization handles it
import {
  ArrowLeft, Bell, Moon, Sun, User, Check, AlertCircle, LogOut,
  CreditCard, ExternalLink, Sparkles
} from 'lucide-react'
import Link from 'next/link'
import { useTheme } from '@/components/providers/ThemeProvider'

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const { theme, setTheme } = useTheme()
  const [notifications, setNotifications] = useState(true)
  const [xUsername, setXUsername] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasLoadedRef = useRef(false)

  // Subscription state
  const [subscription, setSubscription] = useState<{
    hasSubscription: boolean
    tier: 'premium' | 'pro' | null
    billingPeriod: 'monthly' | 'annual' | 'lifetime' | null
    status: string | null
  } | null>(null)
  
  // Usage state (credits and posts)
  const [usage, setUsage] = useState<{
    credits: number
    postsUsed: number
    postsLimit: number
    tier: string
  } | null>(null)

  // Load settings only once on mount
  useEffect(() => {
    if (hasLoadedRef.current) return
    hasLoadedRef.current = true

    async function loadSettings() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load subscription status
      try {
        const subRes = await fetch('/api/subscription/current')
        if (subRes.ok) {
          const subData = await subRes.json()
          setSubscription(subData)
        }
      } catch (err) {
        console.error('Failed to load subscription:', err)
      }
      
      // Load usage (credits and posts)
      try {
        const usageRes = await fetch('/api/subscription/usage')
        if (usageRes.ok) {
          const usageData = await usageRes.json()
          setUsage(usageData)
        }
      } catch (err) {
        console.error('Failed to load usage:', err)
      }

      // Get X username from user metadata or x_accounts table
      const xUsernameFromMeta = user.user_metadata?.x_username
      if (xUsernameFromMeta) {
        setXUsername(xUsernameFromMeta)
      } else {
        // Fallback: check x_accounts table
        const { data: xAccount } = await supabase
          .from('x_accounts')
          .select('x_username')
          .eq('user_id', user.id)
          .limit(1)
          .single()
        
        if (xAccount?.x_username) {
          setXUsername(xAccount.x_username)
        }
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('settings')
        .eq('id', user.id)
        .single()

      if (profile?.settings) {
        const settings = profile.settings as { notifications?: boolean }
        setNotifications(settings.notifications ?? true)
      }
    }

    loadSettings()
  }, [supabase])

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const settings = {
        notifications,
        theme,
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ settings })
        .eq('id', user.id)

      if (updateError) throw updateError

      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  const toggleNotifications = () => {
    setNotifications(prev => !prev)
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/creator-hub"
          className="p-2 rounded-md hover:bg-[var(--card)] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-6 flex items-center gap-2 text-red-400 text-sm p-3 bg-red-400/10 rounded-lg">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Account Section */}
        <section className="bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--background)]">
            <h2 className="font-semibold flex items-center gap-2">
              <User className="w-4 h-4" />
              Account
            </h2>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">X Account</p>
                <p className="text-sm text-[var(--muted)]">
                  {xUsername ? `@${xUsername}` : 'Not connected'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Subscription Section */}
        <section className="bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--background)]">
            <h2 className="font-semibold flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Subscription
            </h2>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Current Plan</p>
                <p className="text-sm text-[var(--muted)]">
                  {subscription?.hasSubscription ? (
                    <>
                      {subscription.tier === 'pro' ? 'Professional' : 'Premium'}
                      {subscription.billingPeriod && subscription.billingPeriod !== 'lifetime' && (
                        <span className="text-[var(--muted)]">
                          {' '}({subscription.billingPeriod === 'annual' ? 'Annual' : 'Monthly'})
                        </span>
                      )}
                      {subscription.billingPeriod === 'lifetime' && (
                        <span className="text-[var(--muted)]"> (Lifetime)</span>
                      )}
                    </>
                  ) : (
                    'Free'
                  )}
                </p>
              </div>
              <Link
                href="/pricing"
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[var(--foreground)] text-[var(--background)] rounded-lg hover:opacity-90 transition-opacity"
              >
                Manage Subscription
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
            
            {/* Usage Stats */}
            {usage && (
              <div className="mt-4 pt-4 border-t border-[var(--border)]">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[var(--background)] rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">⚡</span>
                      <span className="text-sm font-medium text-[var(--muted)]">Credits</span>
                    </div>
                    <p className="text-2xl font-bold">{usage.credits}</p>
                    <p className="text-xs text-[var(--muted)]">remaining this month</p>
                  </div>
                  <div className="bg-[var(--background)] rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">📝</span>
                      <span className="text-sm font-medium text-[var(--muted)]">Posts</span>
                    </div>
                    <p className="text-2xl font-bold">
                      {usage.postsUsed}
                      {usage.postsLimit > 0 && <span className="text-sm font-normal text-[var(--muted)]"> / {usage.postsLimit}</span>}
                      {usage.postsLimit === -1 && <span className="text-sm font-normal text-[var(--muted)]"> / ∞</span>}
                    </p>
                    <p className="text-xs text-[var(--muted)]">used this month</p>
                  </div>
                </div>
                <Link
                  href="/pricing#credits"
                  className="block mt-3 text-center text-sm text-accent hover:underline"
                >
                  Need more credits? Buy credit packs →
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Customization Link */}
        <section className="bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--background)]">
            <h2 className="font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Content Customization
            </h2>
          </div>
          <div className="p-4">
            <p className="text-sm text-[var(--muted)] mb-4">
              Customize your voice, style templates, content niches, and more.
            </p>
            <Link
              href="/customization"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[var(--accent)] text-[var(--background)] rounded-lg hover:opacity-90 transition-opacity w-fit"
            >
              <Sparkles className="w-4 h-4" />
              Open Customization
            </Link>
          </div>
        </section>

        {/* Appearance Section */}
        <section className="bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--background)]">
            <h2 className="font-semibold flex items-center gap-2">
              {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              Appearance
            </h2>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Theme</p>
                <p className="text-sm text-[var(--muted)]">
                  {theme === 'dark' ? 'Dark mode' : 'Light mode'}
                </p>
              </div>
              <button
                onClick={toggleTheme}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  theme === 'light' ? 'bg-accent' : 'bg-[var(--border)]'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    theme === 'light' ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* Notifications Section */}
        <section className="bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--background)]">
            <h2 className="font-semibold flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Notifications
            </h2>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-[var(--muted)]">
                  Receive email updates about your scheduled posts
                </p>
              </div>
              <button
                onClick={toggleNotifications}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  notifications ? 'bg-accent' : 'bg-[var(--border)]'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    notifications ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* Save & Sign Out */}
        <div className="flex items-center justify-between pt-4">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-[var(--foreground)] text-[var(--background)] rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : saved ? (
              <Check className="w-4 h-4" />
            ) : null}
            {saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
