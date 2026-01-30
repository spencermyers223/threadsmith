/**
 * Subscription tier utilities
 * 
 * Tiers:
 * - free: No subscription, limited features
 * - premium: $19.99/mo - 1 X account, core analytics, all post types
 * - pro: $39.99/mo - 5 X accounts, advanced analytics, priority support
 * 
 * Trial:
 * - All new users get 7-day free trial with full premium access
 * - After trial expires, reverts to free tier unless subscribed
 */

export type SubscriptionTier = 'free' | 'premium' | 'pro';

export interface SubscriptionStatus {
  tier: SubscriptionTier;
  isActive: boolean;
  isTrial: boolean;
  trialDaysRemaining: number | null;
  trialEndsAt: Date | null;
  maxAccounts: number;
  features: {
    unlimitedGenerations: boolean;
    voiceTraining: boolean;
    chromeExtension: boolean;
    contentCalendar: boolean;
    coreAnalytics: boolean;
    advancedAnalytics: boolean;
    multiAccount: boolean;
    prioritySupport: boolean;
    templates: boolean;
  };
}

/**
 * Feature flags by tier
 */
const TIER_FEATURES: Record<SubscriptionTier, SubscriptionStatus['features']> = {
  free: {
    unlimitedGenerations: false,
    voiceTraining: false,
    chromeExtension: false,
    contentCalendar: false,
    coreAnalytics: false,
    advancedAnalytics: false,
    multiAccount: false,
    prioritySupport: false,
    templates: false,
  },
  premium: {
    unlimitedGenerations: true,
    voiceTraining: true,
    chromeExtension: true,
    contentCalendar: true,
    coreAnalytics: true,
    advancedAnalytics: false, // Pro only
    multiAccount: false, // Pro only
    prioritySupport: false, // Pro only
    templates: true,
  },
  pro: {
    unlimitedGenerations: true,
    voiceTraining: true,
    chromeExtension: true,
    contentCalendar: true,
    coreAnalytics: true,
    advancedAnalytics: true,
    multiAccount: true,
    prioritySupport: true,
    templates: true,
  },
};

/**
 * Max X accounts by tier
 */
const TIER_MAX_ACCOUNTS: Record<SubscriptionTier, number> = {
  free: 1,
  premium: 1,
  pro: 5,
};

/**
 * Calculate days remaining in trial
 */
function calculateTrialDaysRemaining(trialEndsAt: string | Date | null): number | null {
  if (!trialEndsAt) return null;
  
  const endDate = new Date(trialEndsAt);
  const now = new Date();
  const diffMs = endDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
}

/**
 * Get subscription status from subscription data
 */
export function getSubscriptionStatus(subscription: {
  status?: string | null;
  tier?: string | null;
  max_x_accounts?: number | null;
  trial_ends_at?: string | null;
} | null): SubscriptionStatus {
  const isTrial = subscription?.status === 'trialing';
  const trialEndsAt = subscription?.trial_ends_at ? new Date(subscription.trial_ends_at) : null;
  const trialDaysRemaining = calculateTrialDaysRemaining(subscription?.trial_ends_at || null);
  
  // Check if trial has expired (status might not be updated yet)
  const trialExpired = isTrial && trialEndsAt && trialEndsAt < new Date();
  
  // Determine if subscription is active
  const isActive = (subscription?.status === 'active' || 
                   subscription?.status === 'trialing' ||
                   subscription?.status === 'lifetime') && !trialExpired;
  
  // Determine tier (default to free if no active subscription)
  let tier: SubscriptionTier = 'free';
  if (isActive && subscription?.tier) {
    tier = subscription.tier as SubscriptionTier;
  } else if (isActive) {
    // Legacy: active subscription without tier = premium
    tier = 'premium';
  }
  
  return {
    tier,
    isActive,
    isTrial: isTrial && !trialExpired,
    trialDaysRemaining: isTrial && !trialExpired ? trialDaysRemaining : null,
    trialEndsAt: isTrial && !trialExpired ? trialEndsAt : null,
    maxAccounts: TIER_MAX_ACCOUNTS[tier],
    features: TIER_FEATURES[tier],
  };
}

/**
 * Check if user has a specific feature
 */
export function hasFeature(
  subscription: Parameters<typeof getSubscriptionStatus>[0],
  feature: keyof SubscriptionStatus['features']
): boolean {
  const status = getSubscriptionStatus(subscription);
  return status.features[feature];
}

/**
 * Check if user can add more X accounts
 */
export function canAddAccount(
  subscription: Parameters<typeof getSubscriptionStatus>[0],
  currentAccountCount: number
): boolean {
  const status = getSubscriptionStatus(subscription);
  return currentAccountCount < status.maxAccounts;
}

/**
 * Get upgrade prompt based on missing feature
 */
export function getUpgradePrompt(
  currentTier: SubscriptionTier,
  feature: keyof SubscriptionStatus['features']
): { title: string; description: string; targetTier: SubscriptionTier } | null {
  const currentFeatures = TIER_FEATURES[currentTier];
  
  // Already has the feature
  if (currentFeatures[feature]) return null;
  
  // Find the tier that has this feature
  if (TIER_FEATURES.premium[feature]) {
    return {
      title: 'Upgrade to Premium',
      description: `Unlock ${formatFeatureName(feature)} and more with Premium.`,
      targetTier: 'premium',
    };
  }
  
  if (TIER_FEATURES.pro[feature]) {
    return {
      title: 'Upgrade to Pro',
      description: `${formatFeatureName(feature)} is available with Pro. Get advanced features and manage up to 5 X accounts.`,
      targetTier: 'pro',
    };
  }
  
  return null;
}

/**
 * Get trial-specific upgrade prompt
 */
export function getTrialUpgradePrompt(trialDaysRemaining: number | null): {
  title: string;
  description: string;
  urgency: 'low' | 'medium' | 'high';
} | null {
  if (trialDaysRemaining === null) return null;
  
  if (trialDaysRemaining <= 0) {
    return {
      title: 'Trial Ended',
      description: 'Your free trial has ended. Subscribe to keep all premium features.',
      urgency: 'high',
    };
  }
  
  if (trialDaysRemaining <= 2) {
    return {
      title: `Trial ends in ${trialDaysRemaining} day${trialDaysRemaining === 1 ? '' : 's'}`,
      description: 'Subscribe now to continue using all features without interruption.',
      urgency: 'high',
    };
  }
  
  if (trialDaysRemaining <= 4) {
    return {
      title: `${trialDaysRemaining} days left in trial`,
      description: 'Enjoying xthread? Subscribe to keep your content flowing.',
      urgency: 'medium',
    };
  }
  
  return {
    title: `${trialDaysRemaining} days left in trial`,
    description: 'Explore all premium features free for 7 days.',
    urgency: 'low',
  };
}

function formatFeatureName(feature: keyof SubscriptionStatus['features']): string {
  const names: Record<string, string> = {
    unlimitedGenerations: 'Unlimited Generations',
    voiceTraining: 'Voice Training',
    chromeExtension: 'Chrome Extension',
    contentCalendar: 'Content Calendar',
    coreAnalytics: 'Analytics',
    advancedAnalytics: 'Advanced Analytics',
    multiAccount: 'Multi-Account Support',
    prioritySupport: 'Priority Support',
    templates: 'Templates',
  };
  return names[feature] || feature;
}

/**
 * Stripe price IDs by tier (to be configured in .env)
 * 
 * Required env vars:
 * - STRIPE_PREMIUM_MONTHLY_PRICE_ID: price_1Sv6LnKaJzMO9MxPb49sOGrx
 * - STRIPE_PREMIUM_ANNUAL_PRICE_ID: price_1Sv6OfKaJzMO9MxPlXJhLHav
 * - STRIPE_PRO_MONTHLY_PRICE_ID: price_1Sv6MsKaJzMO9MxPqlcbC63b
 * - STRIPE_PRO_ANNUAL_PRICE_ID: price_1Sv6PMKaJzMO9MxP9wKf2IiY
 */
export const STRIPE_PRICE_IDS = {
  premium: {
    monthly: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID || process.env.STRIPE_MONTHLY_PRICE_ID,
    annual: process.env.STRIPE_PREMIUM_ANNUAL_PRICE_ID || process.env.STRIPE_ANNUAL_PRICE_ID,
  },
  pro: {
    monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    annual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID,
  },
};

/**
 * Get tier from Stripe price ID
 */
export function getTierFromPriceId(priceId: string): SubscriptionTier {
  if (priceId === STRIPE_PRICE_IDS.pro.monthly || priceId === STRIPE_PRICE_IDS.pro.annual) {
    return 'pro';
  }
  if (priceId === STRIPE_PRICE_IDS.premium.monthly || priceId === STRIPE_PRICE_IDS.premium.annual) {
    return 'premium';
  }
  // Default to premium for legacy price IDs
  return 'premium';
}
