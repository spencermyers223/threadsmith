'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getSubscriptionStatus, hasFeature, canAddAccount, type SubscriptionStatus } from '@/lib/subscription';

interface UseSubscriptionReturn extends SubscriptionStatus {
  isLoading: boolean;
  error: Error | null;
  hasFeature: (feature: keyof SubscriptionStatus['features']) => boolean;
  canAddAccount: (currentCount: number) => boolean;
  refetch: () => Promise<void>;
}

export function useSubscription(): UseSubscriptionReturn {
  const [subscription, setSubscription] = useState<{
    status: string | null;
    tier: string | null;
    max_x_accounts: number | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSubscription = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setSubscription(null);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('subscriptions')
        .select('status, tier, max_x_accounts')
        .eq('user_id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      setSubscription(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch subscription'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, []);

  const status = getSubscriptionStatus(subscription);

  return {
    ...status,
    isLoading,
    error,
    hasFeature: (feature) => hasFeature(subscription, feature),
    canAddAccount: (currentCount) => canAddAccount(subscription, currentCount),
    refetch: fetchSubscription,
  };
}
