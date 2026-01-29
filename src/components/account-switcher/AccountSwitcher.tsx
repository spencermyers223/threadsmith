'use client';

import { useState, useRef, useEffect } from 'react';
import { useXAccount } from '@/contexts/XAccountContext';
import { ChevronDown, Plus, Check } from 'lucide-react';
import Image from 'next/image';

interface AccountSwitcherProps {
  /** Custom handler for add account - if not provided, uses default OAuth flow */
  onAddAccount?: () => void;
  /** Hide the add account button entirely */
  hideAddAccount?: boolean;
}

export function AccountSwitcher({ onAddAccount, hideAddAccount = false }: AccountSwitcherProps) {
  const { accounts, activeAccount, isLoading, setActiveAccount } = useXAccount();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Default add account handler - redirect to OAuth link flow
  const handleAddAccount = () => {
    if (onAddAccount) {
      onAddAccount();
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
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
      >
        {/* Active Account Avatar */}
        <div className="relative">
          {activeAccount?.x_profile_image_url ? (
            <Image
              src={activeAccount.x_profile_image_url}
              alt={activeAccount.x_username}
              width={32}
              height={32}
              className="rounded-full"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#D4A574]/20 flex items-center justify-center text-[#D4A574] text-sm font-medium">
              {activeAccount?.x_username?.charAt(0).toUpperCase() || '?'}
            </div>
          )}
          {accounts.length > 1 && (
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#0A0A0A] rounded-full flex items-center justify-center">
              <span className="text-[10px] text-gray-400">{accounts.length}</span>
            </div>
          )}
        </div>

        {/* Account Handle */}
        <span className="text-sm text-gray-300 hidden sm:block max-w-[120px] truncate">
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
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-[#D4A574]"
              >
                <div className="w-10 h-10 rounded-full border-2 border-dashed border-[#D4A574]/30 flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium">Add X Account</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
