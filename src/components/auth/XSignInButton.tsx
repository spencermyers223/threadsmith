'use client'

import { useState } from 'react'

interface XSignInButtonProps {
  className?: string
}

export default function XSignInButton({ className = '' }: XSignInButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleSignIn = () => {
    setLoading(true)
    // Redirect to our X OAuth initiation endpoint
    window.location.href = '/api/auth/x'
  }

  return (
    <button
      onClick={handleSignIn}
      disabled={loading}
      className={`
        flex items-center justify-center gap-3 
        px-6 py-3 
        bg-black text-white 
        rounded-lg font-medium
        hover:bg-gray-800 
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-colors
        ${className}
      `}
    >
      {loading ? (
        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      )}
      <span>{loading ? 'Connecting...' : 'Sign in with X'}</span>
    </button>
  )
}
