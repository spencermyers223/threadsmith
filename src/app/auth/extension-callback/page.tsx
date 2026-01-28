'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ExtensionCallbackPage() {
  const searchParams = useSearchParams();
  const state = searchParams.get('state');
  const supabase = createClient();
  const [status, setStatus] = useState<'checking' | 'success' | 'error'>('checking');
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    checkAuthAndShowToken();
  }, []);

  async function checkAuthAndShowToken() {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.access_token) {
        setToken(session.access_token);
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setStatus('error');
    }
  }

  const copyToken = async () => {
    if (token) {
      await navigator.clipboard.writeText(token);
      alert('Token copied! Paste it in the extension.');
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-indigo-500 bg-clip-text text-transparent mb-6">
          xthread Extension
        </div>
        
        {status === 'checking' && (
          <>
            <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Checking authentication...</p>
          </>
        )}
        
        {status === 'success' && token && (
          <div className="space-y-4">
            <div className="text-green-500 text-5xl mb-4">✓</div>
            <p className="text-white text-lg mb-2">You're signed in!</p>
            <p className="text-gray-400 text-sm mb-4">
              Copy this token and paste it in the extension popup:
            </p>
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 mb-4">
              <code className="text-xs text-purple-400 break-all select-all">
                {token.substring(0, 50)}...
              </code>
            </div>
            <button 
              onClick={copyToken}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-lg transition-all"
            >
              Copy Token
            </button>
            <p className="text-gray-500 text-xs mt-4">
              This token is valid for your current session. Keep it private.
            </p>
          </div>
        )}
        
        {status === 'error' && (
          <div className="space-y-4">
            <div className="text-red-500 text-5xl mb-4">✗</div>
            <p className="text-white text-lg mb-2">Not signed in</p>
            <p className="text-gray-400 text-sm mb-4">
              Please sign in to xthread first, then try connecting the extension again.
            </p>
            <a 
              href="/login"
              className="block w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-lg transition-all text-center"
            >
              Sign In
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
