'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Loader2, CheckCircle, XCircle, Link2 } from 'lucide-react'

export default function LinkAccountPage() {
  const params = useParams()
  const sessionId = params.sessionId as string
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'expired' | 'completed'>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function checkAndRedirect() {
      try {
        // Check if session is valid
        const res = await fetch(`/api/auth/x/link-session?id=${sessionId}`)
        const data = await res.json()

        if (!res.ok || data.error) {
          setStatus('invalid')
          setError(data.error || 'Invalid or expired link')
          return
        }

        if (data.status === 'expired') {
          setStatus('expired')
          setError('This link has expired. Please generate a new one.')
          return
        }

        if (data.status === 'completed') {
          setStatus('completed')
          return
        }

        // Session is valid, redirect to OAuth
        setStatus('valid')
        
        // Small delay to show the UI, then redirect
        setTimeout(() => {
          window.location.href = `/api/auth/x/link?session=${sessionId}`
        }, 1500)
      } catch {
        setStatus('invalid')
        setError('Failed to verify link')
      }
    }

    checkAndRedirect()
  }, [sessionId])

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 mx-auto mb-4 text-[#D4A574] animate-spin" />
            <h1 className="text-xl font-bold mb-2">Verifying Link...</h1>
            <p className="text-[var(--muted)]">Please wait</p>
          </>
        )}

        {status === 'valid' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#D4A574]/20 flex items-center justify-center">
              <Link2 className="w-8 h-8 text-[#D4A574]" />
            </div>
            <h1 className="text-xl font-bold mb-2">Link Your X Account</h1>
            <p className="text-[var(--muted)] mb-4">
              You&apos;ll be redirected to X to authorize your account.
            </p>
            <p className="text-sm text-[var(--muted)]">
              Make sure you&apos;re logged into the X account you want to add.
            </p>
            <div className="mt-6">
              <Loader2 className="w-5 h-5 mx-auto text-[#D4A574] animate-spin" />
              <p className="text-xs text-[var(--muted)] mt-2">Redirecting to X...</p>
            </div>
          </>
        )}

        {status === 'completed' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h1 className="text-xl font-bold mb-2">Account Linked!</h1>
            <p className="text-[var(--muted)]">
              Your X account has been successfully linked. You can close this window.
            </p>
          </>
        )}

        {(status === 'invalid' || status === 'expired') && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-xl font-bold mb-2">
              {status === 'expired' ? 'Link Expired' : 'Invalid Link'}
            </h1>
            <p className="text-[var(--muted)]">{error}</p>
            <p className="text-sm text-[var(--muted)] mt-4">
              Please go back to xthread and generate a new link.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
