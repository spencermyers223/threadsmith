'use client'

import XSignInButton from '@/components/auth/XSignInButton'
import { Sparkles, CheckCircle2, Zap, Clock, Target } from 'lucide-react'

export type HeroVariant = 'control' | 'problem' | 'time' | 'tech'

interface HeroProps {
  variant?: HeroVariant
}

// Control: "Your voice. 10x the reach." - Voice/authenticity focused (current)
function HeroControl() {
  return (
    <>
      {/* Trust Badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-gray-400 mb-8">
        <Sparkles className="w-4 h-4 text-[#D4A574]" />
        <span>AI-powered content that actually sounds like you</span>
      </div>

      {/* Main Headline */}
      <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.1] mb-6">
        Your voice.
        <br />
        <span className="text-[#D4A574]">10x the reach.</span>
      </h1>

      {/* Subheadline */}
      <p className="text-xl sm:text-2xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
        Create X content that sounds like you wrote it — because AI trained on your style did. 
        Know if it&apos;ll perform before you post. Grow your audience on autopilot.
      </p>
    </>
  )
}

// Variant A: Problem/frustration focused - "Stop Posting Into the Void"
function HeroProblem() {
  return (
    <>
      {/* Trust Badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-gray-400 mb-8">
        <Target className="w-4 h-4 text-[#D4A574]" />
        <span>Finally know what&apos;s going to work before you post</span>
      </div>

      {/* Main Headline */}
      <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.1] mb-6">
        Stop posting
        <br />
        <span className="text-[#D4A574]">into the void.</span>
      </h1>

      {/* Subheadline */}
      <p className="text-xl sm:text-2xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
        You spend hours crafting the perfect post... and it gets 3 likes. 
        xthread shows you what&apos;ll work before you hit send, so every post counts.
      </p>
    </>
  )
}

// Variant B: Time-saving focused - "Post Daily in 5 Minutes"
function HeroTime() {
  return (
    <>
      {/* Trust Badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-gray-400 mb-8">
        <Clock className="w-4 h-4 text-[#D4A574]" />
        <span>For busy founders who need to show up online</span>
      </div>

      {/* Main Headline */}
      <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.1] mb-6">
        Post daily.
        <br />
        <span className="text-[#D4A574]">In 5 minutes.</span>
      </h1>

      {/* Subheadline */}
      <p className="text-xl sm:text-2xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
        You know you should be posting on X. But who has time? 
        xthread generates a week of content in your voice in minutes — not hours.
      </p>
    </>
  )
}

// Variant C: Technology/voice focused - "The AI That Writes Like You"
function HeroTech() {
  return (
    <>
      {/* Trust Badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-gray-400 mb-8">
        <Zap className="w-4 h-4 text-[#D4A574]" />
        <span>AI trained on YOUR posts, YOUR style, YOUR voice</span>
      </div>

      {/* Main Headline */}
      <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.1] mb-6">
        The AI that
        <br />
        <span className="text-[#D4A574]">writes like you.</span>
      </h1>

      {/* Subheadline */}
      <p className="text-xl sm:text-2xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
        Generic AI sounds robotic. xthread learns from your actual posts — your vocabulary, 
        your tone, your vibe. Generate content your audience can&apos;t tell is AI.
      </p>
    </>
  )
}

export default function HeroSection({ variant = 'control' }: HeroProps) {
  const renderVariant = () => {
    switch (variant) {
      case 'problem':
        return <HeroProblem />
      case 'time':
        return <HeroTime />
      case 'tech':
        return <HeroTech />
      default:
        return <HeroControl />
    }
  }

  return (
    <section className="pt-32 pb-20 px-6">
      <div className="max-w-4xl mx-auto text-center">
        {renderVariant()}

        {/* CTA - Same for all variants */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <XSignInButton className="!text-lg !px-8 !py-4" />
          <a href="#how-it-works" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2">
            See how it works →
          </a>
        </div>

        {/* Trust Signals - Same for all variants */}
        <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            7-day free trial
          </span>
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            No credit card required
          </span>
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            Cancel anytime
          </span>
        </div>
      </div>

      {/* Product Screenshot/Video Placeholder - Same for all */}
      <div className="max-w-5xl mx-auto mt-16">
        <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-b from-white/5 to-transparent shadow-2xl">
          <div className="aspect-video bg-[#111] flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <p className="text-gray-500">Product demo video</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// Export variant names for documentation
export const HERO_VARIANTS = {
  control: 'Your voice. 10x the reach. (Voice/authenticity focus)',
  problem: 'Stop posting into the void. (Problem/frustration focus)',
  time: 'Post daily in 5 minutes. (Time-saving focus)',
  tech: 'The AI that writes like you. (Technology focus)',
} as const
