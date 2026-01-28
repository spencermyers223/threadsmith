'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ExtensionAuthPage() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect');
  const supabase = createClient();
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');

  const checkAuthAndRedirect = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.access_token) {
        setStatus('authenticated');
        
        // Redirect back to extension with token
        if (redirectUrl) {
          const callbackUrl = new URL(redirectUrl);
          callbackUrl.searchParams.set('token', session.access_token);
          window.location.href = callbackUrl.toString();
        }
      } else {
        setStatus('unauthenticated');
        // Redirect to login
        const loginUrl = `/login?redirect=${encodeURIComponent(window.location.href)}`;
        window.location.href = loginUrl;
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setStatus('unauthenticated');
    }
  }, [supabase.auth, redirectUrl]);

  useEffect(() => {
    checkAuthAndRedirect();
  }, [checkAuthAndRedirect]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-indigo-500 bg-clip-text text-transparent mb-4">
          xthread
        </div>
        
        {status === 'loading' && (
          <>
            <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Connecting to extension...</p>
          </>
        )}
        
        {status === 'authenticated' && (
          <>
            <div className="text-green-500 text-4xl mb-4">✓</div>
            <p className="text-gray-400">Authenticated! Redirecting back to extension...</p>
          </>
        )}
        
        {status === 'unauthenticated' && (
          <p className="text-gray-400">Redirecting to login...</p>
        )}
      </div>
    </div>
  );
}
