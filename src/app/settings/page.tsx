'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Bell, Moon, Sun, User, Check, AlertCircle, LogOut,
  Target, Mic, Users, Plus, X, ChevronDown, ChevronUp
} from 'lucide-react'
import Link from 'next/link'
import { useTheme } from '@/components/providers/ThemeProvider'
import { VoiceProfileCard } from '@/components/profile/VoiceProfileCard'

interface Settings {
  notifications: boolean
  theme: 'dark' | 'light'
}

interface ContentProfile {
  primary_niche: string
  secondary_interests: string[]
  specific_protocols: string
  voice_examples: string
  voice_description: string
  tone_formal_casual: number
  tone_hedged_direct: number
  tone_serious_playful: number
  primary_goal: string
  content_frequency: string
  target_audience: string
  admired_accounts: string[]
}

import { TECH_NICHES, CONTENT_GOALS, POSTING_FREQUENCIES } from '@/lib/constants/tech-niches'

// Use centralized constants
const NICHES = TECH_NICHES
const GOALS = CONTENT_GOALS
const FREQUENCIES = POSTING_FREQUENCIES

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const { theme, setTheme } = useTheme()
  const [notifications, setNotifications] = useState(true)
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasLoadedRef = useRef(false)

  // Content profile state
  const [contentProfile, setContentProfile] = useState<ContentProfile>({
    primary_niche: '',
    secondary_interests: [],
    specific_protocols: '',
    voice_examples: '',
    voice_description: '',
    tone_formal_casual: 3,
    tone_hedged_direct: 3,
    tone_serious_playful: 3,
    primary_goal: '',
    content_frequency: '',
    target_audience: '',
    admired_accounts: [],
  })
  const [newAccount, setNewAccount] = useState('')
  const [userId, setUserId] = useState<string | null>(null)

  // Collapsible sections
  const [expandedSections, setExpandedSections] = useState({
    niche: true,
    voice: false,
    goals: false,
  })

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  // Load settings only once on mount
  useEffect(() => {
    if (hasLoadedRef.current) return
    hasLoadedRef.current = true

    async function loadSettings() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setUserId(user.id)
      setEmail(user.email || '')

      const { data: profile } = await supabase
        .from('profiles')
        .select('settings')
        .eq('id', user.id)
        .single()

      if (profile?.settings) {
        const settings = profile.settings as Settings
        setNotifications(settings.notifications ?? true)
      }

      // Load content profile
      const { data: contentProfileData } = await supabase
        .from('content_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (contentProfileData) {
        setContentProfile({
          primary_niche: contentProfileData.primary_niche || contentProfileData.niche || '',
          secondary_interests: contentProfileData.secondary_interests || [],
          specific_protocols: contentProfileData.specific_protocols || '',
          voice_examples: contentProfileData.voice_examples || '',
          voice_description: contentProfileData.voice_description || '',
          tone_formal_casual: contentProfileData.tone_formal_casual || 3,
          tone_hedged_direct: contentProfileData.tone_hedged_direct || 3,
          tone_serious_playful: contentProfileData.tone_serious_playful || 3,
          primary_goal: contentProfileData.primary_goal || contentProfileData.content_goal || '',
          content_frequency: contentProfileData.content_frequency || '',
          target_audience: contentProfileData.target_audience || '',
          admired_accounts: contentProfileData.admired_accounts || [],
        })
      }
    }

    loadSettings()
  }, [supabase])

  const updateContentProfile = (updates: Partial<ContentProfile>) => {
    setContentProfile(prev => ({ ...prev, ...updates }))
  }

  const addAdmiredAccount = () => {
    const handle = newAccount.trim().replace(/^@/, '')
    if (handle && !contentProfile.admired_accounts.includes(handle)) {
      updateContentProfile({ admired_accounts: [...contentProfile.admired_accounts, handle] })
      setNewAccount('')
    }
  }

  const removeAdmiredAccount = (handle: string) => {
    updateContentProfile({
      admired_accounts: contentProfile.admired_accounts.filter(a => a !== handle)
    })
  }

  const toggleSecondaryInterest = (id: string) => {
    const current = contentProfile.secondary_interests
    if (current.includes(id)) {
      updateContentProfile({ secondary_interests: current.filter(i => i !== id) })
    } else {
      updateContentProfile({ secondary_interests: [...current, id] })
    }
  }

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

      // Save profile settings
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ settings })
        .eq('id', user.id)

      if (updateError) throw updateError

      // Save content profile
      const { error: contentError } = await supabase
        .from('content_profiles')
        .upsert({
          user_id: user.id,
          primary_niche: contentProfile.primary_niche,
          niche: contentProfile.primary_niche, // Keep for backwards compatibility
          secondary_interests: contentProfile.secondary_interests,
          specific_protocols: contentProfile.specific_protocols,
          voice_examples: contentProfile.voice_examples,
          voice_description: contentProfile.voice_description,
          tone_formal_casual: contentProfile.tone_formal_casual,
          tone_hedged_direct: contentProfile.tone_hedged_direct,
          tone_serious_playful: contentProfile.tone_serious_playful,
          primary_goal: contentProfile.primary_goal,
          content_goal: contentProfile.primary_goal, // Keep for backwards compatibility
          content_frequency: contentProfile.content_frequency,
          target_audience: contentProfile.target_audience,
          admired_accounts: contentProfile.admired_accounts,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id'
        })

      if (contentError) throw contentError

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

        {/* Voice Profile - Auto-learned from X */}
        <section className="bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--background)]">
            <h2 className="font-semibold flex items-center gap-2">
              <Mic className="w-4 h-4" />
              Your Voice Profile
            </h2>
          </div>
          <div className="p-4">
            <p className="text-sm text-[var(--muted)] mb-4">
              We analyze your X posts to learn your unique writing style. Generated content will sound like you wrote it.
            </p>
            {userId && <VoiceProfileCard userId={userId} />}
          </div>
        </section>

        {/* Content Profile - Niche */}
        <section className="bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('niche')}
            className="w-full px-4 py-3 border-b border-[var(--border)] bg-[var(--background)] flex items-center justify-between"
          >
            <h2 className="font-semibold flex items-center gap-2">
              <Target className="w-4 h-4" />
              Content Niche
            </h2>
            {expandedSections.niche ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {expandedSections.niche && (
            <div className="p-4 space-y-4">
              {/* Primary Niche */}
              <div>
                <label className="block text-sm font-medium mb-2">Primary Niche</label>
                <select
                  value={contentProfile.primary_niche}
                  onChange={(e) => updateContentProfile({ primary_niche: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:border-accent focus:outline-none"
                >
                  <option value="">Select your niche</option>
                  {NICHES.map(niche => (
                    <option key={niche.id} value={niche.id}>{niche.label}</option>
                  ))}
                </select>
              </div>

              {/* Secondary Interests */}
              <div>
                <label className="block text-sm font-medium mb-2">Secondary Interests</label>
                <div className="flex flex-wrap gap-2">
                  {NICHES.filter(n => n.id !== contentProfile.primary_niche).map(niche => {
                    const isSelected = contentProfile.secondary_interests.includes(niche.id)
                    return (
                      <button
                        key={niche.id}
                        onClick={() => toggleSecondaryInterest(niche.id)}
                        className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                          isSelected
                            ? 'bg-accent/20 border border-accent text-accent'
                            : 'bg-[var(--background)] border border-[var(--border)] hover:border-[var(--muted)]'
                        }`}
                      >
                        {niche.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Specific Protocols */}
              <div>
                <label className="block text-sm font-medium mb-2">Specific Protocols/Chains</label>
                <input
                  type="text"
                  value={contentProfile.specific_protocols}
                  onChange={(e) => updateContentProfile({ specific_protocols: e.target.value })}
                  placeholder="e.g., LLMs, React, Kubernetes, GPT-4..."
                  className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:border-accent focus:outline-none"
                />
              </div>
            </div>
          )}
        </section>

        {/* Content Profile - Voice */}
        <section className="bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('voice')}
            className="w-full px-4 py-3 border-b border-[var(--border)] bg-[var(--background)] flex items-center justify-between"
          >
            <h2 className="font-semibold flex items-center gap-2">
              <Mic className="w-4 h-4" />
              Voice & Style
            </h2>
            {expandedSections.voice ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {expandedSections.voice && (
            <div className="p-4 space-y-4">
              {/* Voice Examples */}
              <div>
                <label className="block text-sm font-medium mb-2">Example Tweets (your style)</label>
                <textarea
                  value={contentProfile.voice_examples}
                  onChange={(e) => updateContentProfile({ voice_examples: e.target.value })}
                  placeholder="Paste 5-10 of your best tweets to help us learn your voice..."
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:border-accent focus:outline-none resize-none"
                />
              </div>

              {/* Voice Description */}
              <div>
                <label className="block text-sm font-medium mb-2">Or describe your style</label>
                <textarea
                  value={contentProfile.voice_description}
                  onChange={(e) => updateContentProfile({ voice_description: e.target.value })}
                  placeholder="e.g., I write with technical depth but keep it accessible..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:border-accent focus:outline-none resize-none"
                />
              </div>

              {/* Tone Sliders */}
              <div className="space-y-4 pt-2">
                <div>
                  <div className="flex justify-between text-sm text-[var(--muted)] mb-1">
                    <span>Formal</span>
                    <span>Casual</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={contentProfile.tone_formal_casual}
                    onChange={(e) => updateContentProfile({ tone_formal_casual: parseInt(e.target.value) })}
                    className="w-full accent-accent"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-sm text-[var(--muted)] mb-1">
                    <span>Hedged</span>
                    <span>Direct</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={contentProfile.tone_hedged_direct}
                    onChange={(e) => updateContentProfile({ tone_hedged_direct: parseInt(e.target.value) })}
                    className="w-full accent-accent"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-sm text-[var(--muted)] mb-1">
                    <span>Serious</span>
                    <span>Playful</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={contentProfile.tone_serious_playful}
                    onChange={(e) => updateContentProfile({ tone_serious_playful: parseInt(e.target.value) })}
                    className="w-full accent-accent"
                  />
                </div>
              </div>

              {/* Admired Accounts */}
              <div>
                <label className="block text-sm font-medium mb-2">Accounts You Admire</label>
                <div className="flex gap-2 mb-2">
                  <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">@</span>
                    <input
                      type="text"
                      value={newAccount}
                      onChange={(e) => setNewAccount(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addAdmiredAccount()}
                      placeholder="handle"
                      className="w-full pl-8 pr-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:border-accent focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={addAdmiredAccount}
                    disabled={!newAccount.trim()}
                    className="px-3 py-2 rounded-lg bg-accent text-[var(--accent-text)] hover:opacity-90 disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {contentProfile.admired_accounts.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {contentProfile.admired_accounts.map(handle => (
                      <div
                        key={handle}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--background)] border border-[var(--border)] text-sm"
                      >
                        <span className="text-[var(--muted)]">@</span>
                        {handle}
                        <button
                          onClick={() => removeAdmiredAccount(handle)}
                          className="ml-1 hover:text-red-400"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Content Profile - Goals */}
        <section className="bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('goals')}
            className="w-full px-4 py-3 border-b border-[var(--border)] bg-[var(--background)] flex items-center justify-between"
          >
            <h2 className="font-semibold flex items-center gap-2">
              <Users className="w-4 h-4" />
              Goals & Audience
            </h2>
            {expandedSections.goals ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {expandedSections.goals && (
            <div className="p-4 space-y-4">
              {/* Primary Goal */}
              <div>
                <label className="block text-sm font-medium mb-2">Primary Goal</label>
                <select
                  value={contentProfile.primary_goal}
                  onChange={(e) => updateContentProfile({ primary_goal: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:border-accent focus:outline-none"
                >
                  <option value="">Select your goal</option>
                  {GOALS.map(goal => (
                    <option key={goal.id} value={goal.id}>{goal.label}</option>
                  ))}
                </select>
              </div>

              {/* Content Frequency */}
              <div>
                <label className="block text-sm font-medium mb-2">Posting Frequency</label>
                <div className="flex flex-wrap gap-2">
                  {FREQUENCIES.map(freq => (
                    <button
                      key={freq.id}
                      onClick={() => updateContentProfile({ content_frequency: freq.id })}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                        contentProfile.content_frequency === freq.id
                          ? 'bg-accent text-[var(--accent-text)]'
                          : 'bg-[var(--background)] border border-[var(--border)] hover:border-[var(--muted)]'
                      }`}
                    >
                      {freq.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Audience */}
              <div>
                <label className="block text-sm font-medium mb-2">Target Audience</label>
                <input
                  type="text"
                  value={contentProfile.target_audience}
                  onChange={(e) => updateContentProfile({ target_audience: e.target.value })}
                  placeholder="e.g., AI researchers, startup founders, tech professionals..."
                  className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:border-accent focus:outline-none"
                />
              </div>
            </div>
          )}
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
