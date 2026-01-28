'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function ExtensionCallbackPage() {
  const supabase = createClient();
  const [status, setStatus] = useState<'checking' | 'success' | 'error'>('checking');
  const [token, setToken] = useState<string | null>(null);
  const [autoDetected, setAutoDetected] = useState(false);

  const checkAuthAndShowToken = useCallback(async () => {
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
  }, [supabase.auth]);

  useEffect(() => {
    checkAuthAndShowToken();
  }, [checkAuthAndShowToken]);

  // Check if extension auto-grabbed the token (tab will close)
  useEffect(() => {
    if (token) {
      // Give the extension time to detect and grab the token
      const timer = setTimeout(() => {
        setAutoDetected(false); // If we're still here, extension didn't auto-close
      }, 3000);
      
      setAutoDetected(true);
      return () => clearTimeout(timer);
    }
  }, [token]);

  const copyToken = async () => {
    if (token) {
      await navigator.clipboard.writeText(token);
      alert('Token copied! Paste it in the extension.');
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      {/* Hidden element for extension to grab full token */}
      {token && (
        <input 
          type="hidden" 
          id="full-token" 
          value={token} 
          data-token={token}
        />
      )}
      
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
            <p className="text-white text-lg mb-2">You&apos;re signed in!</p>
            
            {autoDetected ? (
              <p className="text-gray-400 text-sm mb-4">
                The extension should detect this automatically...<br />
                <span className="text-purple-400">This tab will close in a moment.</span>
              </p>
            ) : (
              <>
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
              </>
            )}
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
              href="/login?redirect=/auth/extension-callback"
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
