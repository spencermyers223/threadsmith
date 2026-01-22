import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export const PRICES = {
  monthly: process.env.STRIPE_MONTHLY_PRICE_ID!,
  lifetime: process.env.STRIPE_LIFETIME_PRICE_ID!,
} as const

export type PlanType = keyof typeof PRICES
