'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Bell, Moon, Sun, User, Check, AlertCircle, LogOut } from 'lucide-react'
import Link from 'next/link'
import { useTheme } from '@/components/providers/ThemeProvider'

interface Settings {
  notifications: boolean
  theme: 'dark' | 'light'
}

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const { theme, setTheme } = useTheme()
  const [notifications, setNotifications] = useState(true)
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadSettings = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setEmail(user.email || '')

    const { data: profile } = await supabase
      .from('profiles')
      .select('settings')
      .eq('id', user.id)
      .single()

    if (profile?.settings) {
      const settings = profile.settings as Settings
      setNotifications(settings.notifications)
      // Sync theme from DB if it differs from localStorage
      if (settings.theme && settings.theme !== theme) {
        setTheme(settings.theme)
      }
    }
  }, [supabase, theme, setTheme])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  const handleSave = async () => {
    setSaving(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const settings: Settings = {
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
          href="/dashboard"
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
                <p className="font-medium">Email</p>
                <p className="text-sm text-[var(--muted)]">{email}</p>
              </div>
            </div>
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

        {/* Save Button */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-[var(--accent-text)] rounded-lg transition-colors font-medium"
          >
            {saved ? (
              <>
                <Check className="w-4 h-4" />
                Saved!
              </>
            ) : saving ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>

          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-6 py-2.5 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
