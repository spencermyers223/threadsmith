import Stripe from 'stripe'

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set')
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

// For backwards compatibility
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop: string | symbol) {
    return getStripe()[prop as keyof Stripe];
  }
});

// Legacy price IDs (for backwards compatibility)
export const PRICES = {
  monthly: process.env.STRIPE_MONTHLY_PRICE_ID || process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID || '',
  annual: process.env.STRIPE_ANNUAL_PRICE_ID || process.env.STRIPE_PREMIUM_ANNUAL_PRICE_ID || '',
  // New tiered pricing (flat keys for checkout API)
  premium_monthly: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID || process.env.STRIPE_MONTHLY_PRICE_ID || '',
  premium_annual: process.env.STRIPE_PREMIUM_ANNUAL_PRICE_ID || process.env.STRIPE_ANNUAL_PRICE_ID || '',
  pro_monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || '',
  pro_annual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID || '',
} as const

export type PlanType = keyof typeof PRICES

// New tiered pricing structure
export const TIER_PRICES = {
  premium: {
    monthly: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID || process.env.STRIPE_MONTHLY_PRICE_ID || '',
    annual: process.env.STRIPE_PREMIUM_ANNUAL_PRICE_ID || process.env.STRIPE_ANNUAL_PRICE_ID || '',
  },
  pro: {
    monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || '',
    annual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID || '',
  },
} as const

export type TierType = keyof typeof TIER_PRICES
export type BillingPeriod = 'monthly' | 'annual'

/**
 * Get the Stripe price ID for a tier and billing period
 */
export function getPriceId(tier: TierType, billing: BillingPeriod): string {
  return TIER_PRICES[tier][billing]
}

/**
 * Get tier from price ID
 */
export function getTierFromPriceId(priceId: string): TierType {
  if (priceId === TIER_PRICES.pro.monthly || priceId === TIER_PRICES.pro.annual) {
    return 'pro'
  }
  return 'premium'
}

/**
 * Check if a price ID is for annual billing
 */
export function isAnnualPriceId(priceId: string): boolean {
  return priceId === TIER_PRICES.premium.annual || priceId === TIER_PRICES.pro.annual
}
