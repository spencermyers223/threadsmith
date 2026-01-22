'use client'

import { useState, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import NicheSelector, { Niche } from './NicheSelector'
import VoiceStyleSelector, { VoiceStyle } from './VoiceStyleSelector'
import AdmiredAccountsInput from './AdmiredAccountsInput'

export interface ContentProfileData {
  niche: Niche | null
  voiceStyle: VoiceStyle | null
  admiredAccounts: string[]
}

interface ContentProfileFormProps {
  initialData?: Partial<ContentProfileData>
  onSubmit: (data: ContentProfileData) => Promise<void>
}

export default function ContentProfileForm({
  initialData,
  onSubmit,
}: ContentProfileFormProps) {
  const [niche, setNiche] = useState<Niche | null>(initialData?.niche ?? null)
  const [voiceStyle, setVoiceStyle] = useState<VoiceStyle | null>(
    initialData?.voiceStyle ?? null
  )
  const [admiredAccounts, setAdmiredAccounts] = useState<string[]>(
    initialData?.admiredAccounts ?? []
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAddAccount = useCallback((account: string) => {
    setAdmiredAccounts((prev) => [...prev, account])
  }, [])

  const handleRemoveAccount = useCallback((account: string) => {
    setAdmiredAccounts((prev) => prev.filter((a) => a !== account))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!niche) {
      setError('Please select your content niche')
      return
    }

    if (!voiceStyle) {
      setError('Please select your voice style')
      return
    }

    setIsSubmitting(true)

    try {
      await onSubmit({
        niche,
        voiceStyle,
        admiredAccounts,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isValid = niche && voiceStyle

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <NicheSelector selectedNiche={niche} onSelect={setNiche} />

      <VoiceStyleSelector selectedStyle={voiceStyle} onSelect={setVoiceStyle} />

      <AdmiredAccountsInput
        accounts={admiredAccounts}
        onAdd={handleAddAccount}
        onRemove={handleRemoveAccount}
      />

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!isValid || isSubmitting}
        className={`
          w-full py-3 rounded-lg font-medium text-sm
          bg-[var(--accent)] text-[var(--background)]
          hover:opacity-90 transition-opacity duration-150
          disabled:opacity-50 disabled:cursor-not-allowed
          flex items-center justify-center gap-2
        `}
      >
        {isSubmitting ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Saving...
          </>
        ) : (
          'Save Content Profile'
        )}
      </button>
    </form>
  )
}
