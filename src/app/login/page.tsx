import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'
import Link from 'next/link'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const params = await searchParams
  const redirectTo = params.redirect || '/generate'

  // If already logged in, redirect
  if (user) {
    redirect(redirectTo)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <svg viewBox="0 0 32 32" className="w-10 h-10">
              <defs>
                <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#D4A574' }} />
                  <stop offset="100%" style={{ stopColor: '#A67C52' }} />
                </linearGradient>
              </defs>
              <rect width="32" height="32" fill="#0A0A0A" rx="6" />
              <g transform="translate(16, 16)">
                <path d="M-8,-8 L8,8" stroke="url(#gold)" strokeWidth="3" strokeLinecap="round" />
                <path d="M8,-8 L-8,8" stroke="url(#gold)" strokeWidth="3" strokeLinecap="round" />
              </g>
            </svg>
            <span className="text-2xl font-bold bg-gradient-to-r from-sand to-gold bg-clip-text text-transparent">
              xthread
            </span>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 shadow-xl">
          <h1 className="text-2xl font-bold text-center mb-2">Welcome back</h1>
          <p className="text-[var(--muted)] text-center mb-8">
            Sign in to continue to xthread
          </p>

          <GoogleSignInButton variant="prominent" />

          <div className="mt-6 text-center text-sm text-[var(--muted)]">
            <p>
              Don&apos;t have an account?{' '}
              <span className="text-accent">Signing in will create one</span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-[var(--muted)]">
          <p>
            By signing in, you agree to our{' '}
            <Link href="/terms" className="text-accent hover:underline">Terms</Link>
            {' '}and{' '}
            <Link href="/privacy" className="text-accent hover:underline">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
