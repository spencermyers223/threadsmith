'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { XAccount, XAccountContext as XAccountContextType } from '@/lib/types/x-account';

const XAccountContext = createContext<XAccountContextType | null>(null);

const ACTIVE_ACCOUNT_KEY = 'xthread-active-account-id';

export function XAccountProvider({ children }: { children: React.ReactNode }) {
  const [accounts, setAccounts] = useState<XAccount[]>([]);
  const [activeAccount, setActiveAccountState] = useState<XAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  // Fetch user's X accounts
  const refreshAccounts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAccounts([]);
        setActiveAccountState(null);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('x_accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      const fetchedAccounts = data || [];
      setAccounts(fetchedAccounts);

      // Restore active account from localStorage or use primary
      const savedAccountId = localStorage.getItem(ACTIVE_ACCOUNT_KEY);
      const savedAccount = fetchedAccounts.find(a => a.id === savedAccountId);
      const primaryAccount = fetchedAccounts.find(a => a.is_primary);
      
      setActiveAccountState(savedAccount || primaryAccount || fetchedAccounts[0] || null);
    } catch (err) {
      console.error('Error fetching X accounts:', err);
      setError(err instanceof Error ? err.message : 'Failed to load accounts');
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  // Set active account
  const setActiveAccount = useCallback((accountId: string) => {
    const account = accounts.find(a => a.id === accountId);
    if (account) {
      setActiveAccountState(account);
      localStorage.setItem(ACTIVE_ACCOUNT_KEY, accountId);
    }
  }, [accounts]);

  // Add a new account to state (after OAuth flow)
  const addAccount = useCallback((account: XAccount) => {
    setAccounts(prev => {
      const newAccounts = [...prev, account];
      // If this is the first account, make it active
      if (prev.length === 0) {
        setActiveAccountState(account);
        localStorage.setItem(ACTIVE_ACCOUNT_KEY, account.id);
      }
      return newAccounts;
    });
  }, []);

  // Remove account from state
  const removeAccount = useCallback((accountId: string) => {
    setAccounts(prev => {
      const remaining = prev.filter(a => a.id !== accountId);
      
      // If we removed the active account, switch to primary or first
      setActiveAccountState(current => {
        if (current?.id === accountId) {
          const next = remaining.find(a => a.is_primary) || remaining[0] || null;
          if (next) {
            localStorage.setItem(ACTIVE_ACCOUNT_KEY, next.id);
          } else {
            localStorage.removeItem(ACTIVE_ACCOUNT_KEY);
          }
          return next;
        }
        return current;
      });
      
      return remaining;
    });
  }, []);

  // Load accounts on mount
  useEffect(() => {
    refreshAccounts();
  }, [refreshAccounts]);

  // Listen for auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      refreshAccounts();
    });

    return () => subscription.unsubscribe();
  }, [supabase, refreshAccounts]);

  const value: XAccountContextType = {
    accounts,
    activeAccount,
    isLoading,
    error,
    setActiveAccount,
    refreshAccounts,
    addAccount,
    removeAccount,
  };

  return (
    <XAccountContext.Provider value={value}>
      {children}
    </XAccountContext.Provider>
  );
}

export function useXAccount() {
  const context = useContext(XAccountContext);
  if (!context) {
    throw new Error('useXAccount must be used within an XAccountProvider');
  }
  return context;
}

// Hook to get just the active account ID (for API calls)
export function useActiveAccountId() {
  const { activeAccount } = useXAccount();
  return activeAccount?.id || null;
}
