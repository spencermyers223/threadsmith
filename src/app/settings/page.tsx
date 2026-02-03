'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useXAccount } from '@/contexts/XAccountContext'
import {
  ArrowLeft, Bell, Moon, Sun, User, Check, AlertCircle, LogOut,
  Target, Mic, Users, Plus, X, ChevronDown, ChevronUp, MessageSquare,
  Edit2, Trash2, Copy, CreditCard, ExternalLink, Sparkles, Loader2
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

interface DMTemplate {
  id: string
  title: string
  message_body: string
  times_used: number
  created_at: string
  updated_at: string
}

import { TECH_NICHES, CONTENT_GOALS, POSTING_FREQUENCIES } from '@/lib/constants/tech-niches'

// Use centralized constants
const NICHES = TECH_NICHES
const GOALS = CONTENT_GOALS
const FREQUENCIES = POSTING_FREQUENCIES

export default function SettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const { activeAccount } = useXAccount()
  const { theme, setTheme } = useTheme()
  const [notifications, setNotifications] = useState(true)
  const [xUsername, setXUsername] = useState<string | null>(null)
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
    outreach: false,
  })

  // DM Templates state
  const [dmTemplates, setDmTemplates] = useState<DMTemplate[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<DMTemplate | null>(null)
  const [templateForm, setTemplateForm] = useState({ title: '', message_body: '' })
  const [savingTemplate, setSavingTemplate] = useState(false)

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

  // Style Profiles V2 state
  const [styleProfiles, setStyleProfiles] = useState<Array<{
    id: string
    account_username: string
    profile_data: { summary?: string }
    tweets_analyzed: number
  }>>([])
  const [analyzingAccount, setAnalyzingAccount] = useState<string | null>(null)

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  // DM Templates functions
  const loadDMTemplates = async () => {
    setLoadingTemplates(true)
    try {
      const res = await fetch('/api/dm-templates')
      if (res.ok) {
        const data = await res.json()
        setDmTemplates(data.templates || [])
      }
    } catch (err) {
      console.error('Failed to load DM templates:', err)
    } finally {
      setLoadingTemplates(false)
    }
  }

  const openCreateModal = () => {
    setEditingTemplate(null)
    setTemplateForm({ title: '', message_body: '' })
    setShowTemplateModal(true)
  }

  const openEditModal = (template: DMTemplate) => {
    setEditingTemplate(template)
    setTemplateForm({ title: template.title, message_body: template.message_body })
    setShowTemplateModal(true)
  }

  const closeTemplateModal = () => {
    setShowTemplateModal(false)
    setEditingTemplate(null)
    setTemplateForm({ title: '', message_body: '' })
  }

  const insertVariable = (variable: string) => {
    setTemplateForm(prev => ({
      ...prev,
      message_body: prev.message_body + variable
    }))
  }

  const saveTemplate = async () => {
    if (!templateForm.title.trim() || !templateForm.message_body.trim()) return
    
    setSavingTemplate(true)
    try {
      if (editingTemplate) {
        // Update existing
        const res = await fetch(`/api/dm-templates/${editingTemplate.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(templateForm)
        })
        if (res.ok) {
          const updated = await res.json()
          setDmTemplates(prev => prev.map(t => t.id === updated.id ? updated : t))
        }
      } else {
        // Create new
        const res = await fetch('/api/dm-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(templateForm)
        })
        if (res.ok) {
          const created = await res.json()
          setDmTemplates(prev => [...prev, created])
        }
      }
      closeTemplateModal()
    } catch (err) {
      console.error('Failed to save template:', err)
    } finally {
      setSavingTemplate(false)
    }
  }

  const deleteTemplate = async (id: string) => {
    if (!confirm('Delete this template?')) return
    
    try {
      const res = await fetch(`/api/dm-templates/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setDmTemplates(prev => prev.filter(t => t.id !== id))
      }
    } catch (err) {
      console.error('Failed to delete template:', err)
    }
  }

  const copyTemplate = (messageBody: string) => {
    navigator.clipboard.writeText(messageBody)
  }

  // Load templates when outreach section is expanded
  useEffect(() => {
    if (expandedSections.outreach && dmTemplates.length === 0 && !loadingTemplates) {
      loadDMTemplates()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedSections.outreach])

  // Load settings only once on mount
  useEffect(() => {
    if (hasLoadedRef.current) return
    hasLoadedRef.current = true

    async function loadSettings() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setUserId(user.id)
      
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

      // Load Style Profiles (V2) - will reload when activeAccount changes
      // Initial load without x_account_id, will filter after account is set
      
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
        const settings = profile.settings as Settings
        setNotifications(settings.notifications ?? true)
      }

      // Load content profile for active X account
      // Note: activeAccount might not be available yet on initial load
      // This will be reloaded when activeAccount changes
      const xAccountId = activeAccount?.id
      const { data: contentProfileData } = xAccountId ? await supabase
        .from('content_profiles')
        .select('*')
        .eq('x_account_id', xAccountId)
        .single() : { data: null }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]) // activeAccount?.id handled by separate effect below

  // Reload content profile when active account changes
  const prevAccountIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (!activeAccount?.id) return
    if (prevAccountIdRef.current === activeAccount.id) return
    prevAccountIdRef.current = activeAccount.id
    
    const xAccountId = activeAccount.id
    
    async function loadAccountData() {
      // Load content profile
      const { data: contentProfileData } = await supabase
        .from('content_profiles')
        .select('*')
        .eq('x_account_id', xAccountId)
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
      } else {
        // Reset to defaults if no profile for this account
        setContentProfile({
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
      }

      // Load style profiles for this X account
      try {
        const profilesRes = await fetch(`/api/voice/style-profiles?x_account_id=${xAccountId}`)
        if (profilesRes.ok) {
          const profilesData = await profilesRes.json()
          setStyleProfiles(profilesData.profiles || [])
        }
      } catch (err) {
        console.error('Failed to load style profiles:', err)
        setStyleProfiles([])
      }
    }
    
    loadAccountData()
  }, [activeAccount?.id, supabase])

  const updateContentProfile = (updates: Partial<ContentProfile>) => {
    setContentProfile(prev => ({ ...prev, ...updates }))
  }

  // Style Profiles V2 handlers
  const handleAnalyzeAccount = async (username: string, confirmCredit = false) => {
    if (!activeAccount?.id) {
      setError('Please select an X account first')
      return
    }
    if (styleProfiles.length >= 3) {
      setError('Style profiles full (max 3). Remove one first.')
      return
    }
    if (styleProfiles.some(p => p.account_username.toLowerCase() === username.toLowerCase())) {
      setError(`@${username} is already analyzed`)
      return
    }

    setAnalyzingAccount(username)
    setError(null)

    try {
      // Fetch last 100 tweets from X API (already sorted by engagement)
      const tweetsRes = await fetch(`/api/x/user-tweets?username=${username}&max_results=100`)
      const tweetsData = await tweetsRes.json()

      if (!tweetsRes.ok) {
        throw new Error(tweetsData.error || 'Failed to fetch tweets')
      }

      if (!tweetsData.tweets || tweetsData.tweets.length < 5) {
        throw new Error('Need at least 5 tweets to analyze')
      }

      // Take top 5 tweets by engagement (API already sorted them)
      const topTweets = tweetsData.tweets.slice(0, 5)
      console.log(`Analyzing top 5 of ${tweetsData.tweets.length} tweets from @${username}`)

      // Send top 5 tweets to style profile API for analysis
      const res = await fetch('/api/voice/style-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username,
          tweets: topTweets.map((t: { text: string; metrics?: { like_count?: number } }) => ({ 
            text: t.text, 
            likes: t.metrics?.like_count || 0 
          })),
          x_account_id: activeAccount.id,
          confirmCredit,
        }),
      })

      const data = await res.json()
      
      // Handle credit confirmation required
      if (res.status === 402 && data.requiresConfirmation) {
        setAnalyzingAccount(null)
        const confirmed = window.confirm(
          `⚠️ Credit Required\n\n` +
          `You've used your ${data.freeLimit} free style profiles.\n\n` +
          `This analysis will cost ${data.creditCost} credits.\n` +
          `You have ${data.currentCredits} credits.\n\n` +
          `Continue?`
        )
        if (confirmed) {
          // Retry with confirmation
          return handleAnalyzeAccount(username, true)
        }
        return
      }
      
      if (!res.ok) throw new Error(data.error || 'Failed to analyze')

      setStyleProfiles(prev => [...prev, data.profile])
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      
      // Show credits used if applicable
      if (data.creditsUsed > 0) {
        setError(null)
        // Could show a success toast here: `Used ${data.creditsUsed} credits. ${data.creditsRemaining} remaining.`
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze account')
    } finally {
      setAnalyzingAccount(null)
    }
  }

  const handleRemoveStyleProfile = async (id: string) => {
    try {
      const res = await fetch(`/api/voice/style-profiles?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to remove')
      setStyleProfiles(prev => prev.filter(p => p.id !== id))
    } catch {
      setError('Failed to remove style profile')
    }
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

      // Save content profile for the active X account
      if (!activeAccount?.id) {
        throw new Error('No active X account')
      }
      
      const { error: contentError } = await supabase
        .from('content_profiles')
        .update({
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
        })
        .eq('x_account_id', activeAccount.id)

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

        {/* Voice Profile - Combined Section */}
        <section className="bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--background)]">
            <h2 className="font-semibold flex items-center gap-2">
              <Mic className="w-4 h-4" />
              Your Voice Profile
            </h2>
          </div>
          <div className="p-4 space-y-6">
            {/* Auto-learned voice */}
            <div>
              <p className="text-sm text-[var(--muted)] mb-4">
                We analyze your X posts to learn your unique writing style. Generated content will sound like you wrote it.
              </p>
              {userId && <VoiceProfileCard userId={userId} />}
              
              {/* Link to Voice Library & Style Profiles */}
              <Link
                href="/settings/voice"
                className="mt-4 flex items-center justify-between p-3 rounded-lg bg-accent/10 border border-accent/20 hover:bg-accent/20 transition-colors group"
              >
                <div>
                  <p className="font-medium text-sm">Voice Library & Style Profiles</p>
                  <p className="text-xs text-[var(--muted)]">Add example tweets and analyze creators you admire</p>
                </div>
                <ChevronDown className="w-4 h-4 rotate-[-90deg] text-accent group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Describe your style */}
            <div>
              <label className="block text-sm font-medium mb-2">Describe your style</label>
              <textarea
                value={contentProfile.voice_description}
                onChange={(e) => updateContentProfile({ voice_description: e.target.value })}
                placeholder="e.g., I write with technical depth but keep it accessible. I use humor sparingly but effectively..."
                rows={3}
                className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:border-accent focus:outline-none resize-none"
              />
            </div>

            {/* Tone Sliders */}
            <div className="space-y-4">
              <label className="block text-sm font-medium">Tone Preferences</label>
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

            {/* Style Profiles V2 - Accounts with Analyze */}
            <div className="pt-4 border-t border-[var(--border)]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-violet-500" />
                  <label className="text-sm font-medium">Style Profiles ({styleProfiles.length}/3)</label>
                </div>
              </div>
              <p className="text-sm text-[var(--muted)] mb-3">
                Analyze creators you admire to incorporate their writing patterns into generated content. Select profiles on the Generate page.
              </p>

              {/* Analyzed profiles */}
              {styleProfiles.length > 0 && (
                <div className="space-y-2 mb-4">
                  {styleProfiles.map((profile) => (
                    <div key={profile.id} className="flex items-center gap-3 p-3 rounded-lg bg-violet-500/10 border border-violet-500/20 group">
                      <div className="flex-1">
                        <p className="text-sm font-medium flex items-center gap-2">
                          @{profile.account_username}
                          <span className="text-xs text-violet-400">✓ Analyzed</span>
                        </p>
                        <p className="text-xs text-[var(--muted)] mt-0.5">
                          {profile.profile_data?.summary || `Analyzed ${profile.tweets_analyzed} tweets`}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveStyleProfile(profile.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-red-500/20 text-red-400 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new account to analyze */}
              {styleProfiles.length < 3 && (
                <>
                  <div className="flex gap-2 mb-3">
                    <div className="flex-1 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">@</span>
                      <input
                        type="text"
                        value={newAccount}
                        onChange={(e) => setNewAccount(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && newAccount.trim() && handleAnalyzeAccount(newAccount.trim().replace(/^@/, ''))}
                        placeholder="handle"
                        className="w-full pl-8 pr-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:border-accent focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={() => {
                        const handle = newAccount.trim().replace(/^@/, '')
                        if (handle) {
                          handleAnalyzeAccount(handle)
                          setNewAccount('')
                        }
                      }}
                      disabled={!newAccount.trim() || analyzingAccount !== null}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-500 text-white hover:bg-violet-600 disabled:opacity-50 font-medium"
                    >
                      {analyzingAccount ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      Analyze
                    </button>
                  </div>

                  {/* Quick analyze existing admired accounts */}
                  {contentProfile.admired_accounts.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-[var(--muted)]">Quick analyze from your saved accounts:</p>
                      <div className="flex flex-wrap gap-2">
                        {contentProfile.admired_accounts
                          .filter(acc => !styleProfiles.some(p => p.account_username.toLowerCase() === acc.toLowerCase()))
                          .map(handle => (
                            <button
                              key={handle}
                              onClick={() => handleAnalyzeAccount(handle)}
                              disabled={analyzingAccount === handle}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--background)] border border-[var(--border)] hover:border-violet-500 text-sm transition-colors"
                            >
                              {analyzingAccount === handle ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Sparkles className="w-3 h-3 text-violet-500" />
                              )}
                              @{handle}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {styleProfiles.length === 0 && contentProfile.admired_accounts.length === 0 && (
                <div className="text-center py-4 text-[var(--muted)] text-sm border border-dashed border-[var(--border)] rounded-lg">
                  Add an account handle above and click Analyze to get started!
                </div>
              )}
            </div>
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

              {/* Specific Topics */}
              <div>
                <label className="block text-sm font-medium mb-2">Specific Topics</label>
                <input
                  type="text"
                  value={contentProfile.specific_protocols}
                  onChange={(e) => updateContentProfile({ specific_protocols: e.target.value })}
                  placeholder="e.g., LLMs, React, Next.js, GPT-4, Claude..."
                  className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:border-accent focus:outline-none"
                />
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

        {/* Outreach Templates */}
        <section className="bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('outreach')}
            className="w-full px-4 py-3 border-b border-[var(--border)] bg-[var(--background)] flex items-center justify-between"
          >
            <h2 className="font-semibold flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Outreach Templates
            </h2>
            {expandedSections.outreach ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {expandedSections.outreach && (
            <div className="p-4 space-y-4">
              <p className="text-sm text-[var(--muted)]">
                Create DM templates for cold outreach. Use variables like {'{'}{'{'}<code>username</code>{'}'}{'}'},
                {'{'}{'{'}<code>display_name</code>{'}'}{'}'},
                {'{'}{'{'}<code>bio_snippet</code>{'}'}{'}'}
                to personalize messages.
              </p>

              {/* Template List */}
              {loadingTemplates ? (
                <div className="text-center py-8 text-[var(--muted)]">
                  <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Loading templates...
                </div>
              ) : dmTemplates.length === 0 ? (
                <div className="text-center py-8 text-[var(--muted)]">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No templates yet</p>
                  <p className="text-sm">Create your first outreach template</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {dmTemplates.map(template => (
                    <div
                      key={template.id}
                      className="p-3 rounded-lg bg-[var(--background)] border border-[var(--border)]"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-medium">{template.title}</h3>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => copyTemplate(template.message_body)}
                            className="p-1.5 rounded hover:bg-[var(--card)] transition-colors"
                            title="Copy message"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(template)}
                            className="p-1.5 rounded hover:bg-[var(--card)] transition-colors"
                            title="Edit template"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteTemplate(template.id)}
                            className="p-1.5 rounded hover:bg-red-400/10 text-red-400 transition-colors"
                            title="Delete template"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-[var(--muted)] whitespace-pre-wrap line-clamp-3">
                        {template.message_body}
                      </p>
                      {template.times_used > 0 && (
                        <p className="text-xs text-[var(--muted)] mt-2">
                          Used {template.times_used} time{template.times_used !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add Template Button */}
              <button
                onClick={openCreateModal}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-[var(--border)] hover:border-accent hover:bg-accent/5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Template
              </button>
            </div>
          )}
        </section>

        {/* Template Modal */}
        {showTemplateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl w-full max-w-lg">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
                <h3 className="font-semibold">
                  {editingTemplate ? 'Edit Template' : 'Create Template'}
                </h3>
                <button
                  onClick={closeTemplateModal}
                  className="p-1 rounded hover:bg-[var(--background)] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium mb-2">Template Name</label>
                  <input
                    type="text"
                    value={templateForm.title}
                    onChange={(e) => setTemplateForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Collab Request, Intro DM..."
                    className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:border-accent focus:outline-none"
                  />
                </div>

                {/* Message Body */}
                <div>
                  <label className="block text-sm font-medium mb-2">Message</label>
                  <textarea
                    value={templateForm.message_body}
                    onChange={(e) => setTemplateForm(prev => ({ ...prev, message_body: e.target.value }))}
                    placeholder="Hey {{display_name}}, I noticed you..."
                    rows={6}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:border-accent focus:outline-none resize-none"
                  />
                </div>

                {/* Variable Buttons */}
                <div>
                  <label className="block text-sm font-medium mb-2">Insert Variable</label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => insertVariable('{{username}}')}
                      className="px-2 py-1 text-sm rounded bg-[var(--background)] border border-[var(--border)] hover:border-accent transition-colors"
                    >
                      {'{{username}}'}
                    </button>
                    <button
                      onClick={() => insertVariable('{{display_name}}')}
                      className="px-2 py-1 text-sm rounded bg-[var(--background)] border border-[var(--border)] hover:border-accent transition-colors"
                    >
                      {'{{display_name}}'}
                    </button>
                    <button
                      onClick={() => insertVariable('{{bio_snippet}}')}
                      className="px-2 py-1 text-sm rounded bg-[var(--background)] border border-[var(--border)] hover:border-accent transition-colors"
                    >
                      {'{{bio_snippet}}'}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 px-4 py-3 border-t border-[var(--border)]">
                <button
                  onClick={closeTemplateModal}
                  className="px-4 py-2 rounded-lg hover:bg-[var(--background)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveTemplate}
                  disabled={savingTemplate || !templateForm.title.trim() || !templateForm.message_body.trim()}
                  className="px-4 py-2 rounded-lg bg-accent text-[var(--accent-text)] hover:opacity-90 disabled:opacity-50 transition-colors"
                >
                  {savingTemplate ? 'Saving...' : editingTemplate ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}

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
