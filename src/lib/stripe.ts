import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Price IDs are validated at runtime when accessed
export const PRICES = {
  monthly: process.env.STRIPE_MONTHLY_PRICE_ID || '',
  annual: process.env.STRIPE_ANNUAL_PRICE_ID || '',
} as const

export type PlanType = keyof typeof PRICES
