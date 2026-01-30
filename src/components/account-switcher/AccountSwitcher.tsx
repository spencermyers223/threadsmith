'use client';

import { useState, useRef, useEffect } from 'react';
import { useXAccount } from '@/contexts/XAccountContext';
import { ChevronDown, Plus, Check, X, Sparkles } from 'lucide-react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

interface AccountSwitcherProps {
  /** Custom handler for add account - if not provided, uses default OAuth flow */
  onAddAccount?: () => void;
  /** Hide the add account button entirely */
  hideAddAccount?: boolean;
}

export function AccountSwitcher({ onAddAccount, hideAddAccount = false }: AccountSwitcherProps) {
  const { accounts, activeAccount, isLoading, setActiveAccount } = useXAccount();
  const [isOpen, setIsOpen] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [maxAccounts, setMaxAccounts] = useState(1);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Fetch subscription limits
  useEffect(() => {
    async function fetchSubscriptionLimits() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('max_x_accounts, status')
        .eq('user_id', user.id)
        .single();

      if (subscription?.status === 'active' || subscription?.status === 'trialing') {
        setMaxAccounts(subscription.max_x_accounts || 1);
      }
    }

    fetchSubscriptionLimits();
  }, [supabase]);

  // Check if user can add more accounts
  const canAddAccount = accounts.length < maxAccounts;

  // Default add account handler - redirect to OAuth link flow
  const handleAddAccount = async () => {
    if (onAddAccount) {
      onAddAccount();
      return;
    }

    setIsCheckingSubscription(true);

    // Re-check subscription status before proceeding
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsCheckingSubscription(false);
      return;
    }

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('max_x_accounts, status')
      .eq('user_id', user.id)
      .single();

    const currentMax = (subscription?.status === 'active' || subscription?.status === 'trialing') 
      ? (subscription.max_x_accounts || 1) 
      : 1;

    setIsCheckingSubscription(false);

    if (accounts.length >= currentMax) {
      // Show upgrade modal
      setShowUpgradeModal(true);
    } else {
      // Redirect to X OAuth with link action
      window.location.href = '/api/auth/x?action=link';
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Don't render if no accounts
  if (!activeAccount && !isLoading) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="h-10 w-10 rounded-full bg-white/10 animate-pulse" />
    );
  }

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        {/* Trigger Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
        >
          {/* Account Handle */}
          <span className="text-sm text-gray-300 max-w-[120px] truncate">
            @{activeAccount?.x_username}
          </span>

          {/* Dropdown Arrow */}
          <ChevronDown 
            className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute right-0 top-full mt-2 w-64 bg-[#1A1A1A] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/10">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Switch Account</p>
            </div>

            {/* Account List */}
            <div className="max-h-[300px] overflow-y-auto">
              {accounts.map((account) => (
                <button
                  key={account.id}
                  onClick={() => {
                    setActiveAccount(account.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors ${
                    account.id === activeAccount?.id ? 'bg-white/5' : ''
                  }`}
                >
                  {/* Avatar */}
                  {account.x_profile_image_url ? (
                    <Image
                      src={account.x_profile_image_url}
                      alt={account.x_username}
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#D4A574]/20 flex items-center justify-center text-[#D4A574] font-medium">
                      {account.x_username?.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}

                  {/* Account Info */}
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {account.x_display_name || account.x_username}
                    </p>
                    <p className="text-xs text-gray-500 truncate">@{account.x_username}</p>
                  </div>

                  {/* Active Indicator */}
                  {account.id === activeAccount?.id && (
                    <Check className="w-4 h-4 text-[#D4A574] flex-shrink-0" />
                  )}

                  {/* Primary Badge */}
                  {account.is_primary && account.id !== activeAccount?.id && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#D4A574]/10 text-[#D4A574] flex-shrink-0">
                      Primary
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Add Account Button */}
            {!hideAddAccount && (
              <>
                <div className="border-t border-white/10" />
                <button
                  onClick={() => {
                    setIsOpen(false);
                    handleAddAccount();
                  }}
                  disabled={isCheckingSubscription}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-[#D4A574] disabled:opacity-50"
                >
                  <div className="w-10 h-10 rounded-full border-2 border-dashed border-[#D4A574]/30 flex items-center justify-center">
                    <Plus className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium">
                    {isCheckingSubscription ? 'Checking...' : 'Add X Account'}
                  </span>
                  {!canAddAccount && (
                    <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-[#D4A574]/10 text-[#D4A574]">
                      Pro
                    </span>
                  )}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl w-full max-w-md mx-4 overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="relative px-6 py-8 bg-gradient-to-b from-[#D4A574]/20 to-transparent">
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-[#D4A574]/20">
                <Sparkles className="w-8 h-8 text-[#D4A574]" />
              </div>
              <h2 className="text-xl font-bold text-center text-white">
                Unlock Multi-Account
              </h2>
              <p className="text-center text-gray-400 mt-2">
                Manage multiple X accounts from one dashboard
              </p>
            </div>

            {/* Content */}
            <div className="px-6 py-6">
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-[#D4A574]" />
                  <span className="text-gray-300">Connect unlimited X accounts</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-[#D4A574]" />
                  <span className="text-gray-300">Separate voice profiles per account</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-[#D4A574]" />
                  <span className="text-gray-300">Switch between accounts instantly</span>
                </div>
                <div className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-[#D4A574]" />
                  <span className="text-gray-300">Dedicated folders & analytics per account</span>
                </div>
              </div>

              <button
                onClick={() => {
                  // Navigate to upgrade page or trigger Stripe checkout
                  window.location.href = '/settings?tab=billing&upgrade=pro';
                }}
                className="w-full py-3 px-4 bg-[#D4A574] hover:bg-[#C49664] text-black font-semibold rounded-lg transition-colors"
              >
                Upgrade to Pro
              </button>

              <p className="text-center text-xs text-gray-500 mt-4">
                Starting at $9.99/month • Cancel anytime
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
