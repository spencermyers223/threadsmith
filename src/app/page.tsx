import XSignInButton from '@/components/auth/XSignInButton'
import { Zap, Brain, Calendar, Target, TrendingUp, Sparkles, Clock, BarChart3, PenTool, Users, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0A0A0A] text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#0A0A0A]/80 backdrop-blur-lg">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-[#D4A574]">xthread</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </nav>
          <XSignInButton className="!py-2 !px-4 !text-sm" />
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
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

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <XSignInButton className="!text-lg !px-8 !py-4" />
            <a href="#how-it-works" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2">
              See how it works →
            </a>
          </div>

          {/* Trust Signals */}
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              5 free generations
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

        {/* Product Screenshot/Video Placeholder */}
        <div className="max-w-5xl mx-auto mt-16">
          <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-b from-white/5 to-transparent shadow-2xl">
            <div className="aspect-video bg-[#111] flex items-center justify-center">
              {/* TODO: Replace with actual product video */}
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

      {/* Problem Section */}
      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            Growing on X is hard. We make it easy.
          </h2>
          <p className="text-xl text-gray-400 mb-12">
            You have ideas. You know your stuff. But turning that into consistent, 
            engaging content that grows your audience? That&apos;s where most creators get stuck.
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <ProblemCard
              icon={<Clock className="w-6 h-6" />}
              title="No time to write"
              description="You're building a business. Writing 3 posts a day isn't realistic."
            />
            <ProblemCard
              icon={<Brain className="w-6 h-6" />}
              title="AI sounds robotic"
              description="Generic AI tools don't know your voice. The content feels... off."
            />
            <ProblemCard
              icon={<Target className="w-6 h-6" />}
              title="Guessing what works"
              description="You post and pray. No idea if content will perform until it's live."
            />
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-20 px-6 bg-gradient-to-b from-[#D4A574]/5 to-transparent">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            xthread is your unfair advantage
          </h2>
          <p className="text-xl text-gray-400 mb-4">
            AI that learns YOUR voice. Scoring that predicts performance.
            <br />A calendar that keeps you consistent.
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Feature 1: Voice Training */}
          <FeatureRow
            badge="Voice Training"
            title="AI that actually sounds like you"
            description="Connect your X account and we'll analyze your past posts. The AI learns your vocabulary, tone, sentence structure — everything that makes your writing yours. Generate content that your audience won't know is AI-assisted."
            icon={<PenTool className="w-8 h-8" />}
            features={[
              "Learns from your existing posts",
              "Captures your unique tone and style",
              "Gets better the more you use it",
            ]}
            imagePosition="right"
          />

          {/* Feature 2: Algorithm Scoring */}
          <FeatureRow
            badge="Algorithm Score"
            title="Know before you post"
            description="Our scoring engine analyzes your draft against proven engagement patterns. Hook strength, reply potential, optimal length — see exactly how your post will perform and get suggestions to improve it."
            icon={<BarChart3 className="w-8 h-8" />}
            features={[
              "Real-time engagement prediction",
              "Actionable improvement tips",
              "Based on actual X algorithm signals",
            ]}
            imagePosition="left"
          />

          {/* Feature 3: Content Calendar */}
          <FeatureRow
            badge="Content Calendar"
            title="Plan a month in 30 minutes"
            description="Drag, drop, schedule. See your entire content strategy at a glance. One-click posting when you're ready. Never miss a day, never scramble for ideas."
            icon={<Calendar className="w-8 h-8" />}
            features={[
              "Visual weekly/monthly view",
              "Drag and drop scheduling",
              "Post directly to X",
            ]}
            imagePosition="right"
          />

          {/* Feature 4: Multiple Post Types */}
          <FeatureRow
            badge="6 Post Types"
            title="Every format you need"
            description="Threads, hot takes, how-to posts, personal stories, engagement hooks, and more. Each format is optimized for maximum reach. Pick a type, add your topic, generate."
            icon={<Zap className="w-8 h-8" />}
            features={[
              "Threads that get saved",
              "Hot takes that spark debate",
              "Stories that build connection",
            ]}
            imagePosition="left"
          />
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              From zero to scheduled in 5 minutes
            </h2>
            <p className="text-xl text-gray-400">
              Three steps to content that converts.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              number="1"
              title="Connect your X"
              description="Sign in with your X account. We'll analyze your past posts to learn your unique voice."
            />
            <StepCard
              number="2"
              title="Generate content"
              description="Pick a post type, enter your topic. Get multiple variations in your voice, scored for engagement."
            />
            <StepCard
              number="3"
              title="Schedule & grow"
              description="Drag posts to your calendar. We'll post for you at optimal times. Watch your audience grow."
            />
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 px-6 bg-gradient-to-b from-white/5 to-transparent">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Built for creators who are serious about growth
          </h2>
          <p className="text-xl text-gray-400 mb-12">
            Whether you&apos;re building a personal brand, growing a business, or becoming a thought leader — 
            xthread helps you show up consistently with content that performs.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            {['Founders', 'Creators', 'Coaches', 'Consultants', 'Freelancers', 'Marketers', 'Developers', 'Designers'].map((type) => (
              <span 
                key={type}
                className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm"
              >
                {type}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Simple pricing. Unlimited potential.
            </h2>
            <p className="text-xl text-gray-400">
              Less than a coffee per week to 10x your content output.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Monthly */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
              <div className="text-sm text-gray-400 mb-2">Monthly</div>
              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-4xl font-bold">$9.99</span>
                <span className="text-gray-500">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <PricingFeature>Unlimited generations</PricingFeature>
                <PricingFeature>Voice training</PricingFeature>
                <PricingFeature>Algorithm scoring</PricingFeature>
                <PricingFeature>Content calendar</PricingFeature>
                <PricingFeature>Direct posting to X</PricingFeature>
              </ul>
              <XSignInButton className="w-full" />
            </div>

            {/* Annual */}
            <div className="rounded-2xl border-2 border-[#D4A574] bg-gradient-to-b from-[#D4A574]/10 to-transparent p-8 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#D4A574] text-black text-xs font-bold rounded-full">
                BEST VALUE
              </div>
              <div className="text-sm text-[#D4A574] mb-2">Annual</div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-4xl font-bold">$99.99</span>
                <span className="text-gray-500">/year</span>
              </div>
              <div className="text-sm text-green-400 mb-4">Save $20 (2 months free)</div>
              <ul className="space-y-3 mb-8">
                <PricingFeature>Everything in Monthly</PricingFeature>
                <PricingFeature highlight>Priority support</PricingFeature>
                <PricingFeature highlight>Early access to new features</PricingFeature>
                <PricingFeature highlight>Lock in price forever</PricingFeature>
              </ul>
              <XSignInButton className="w-full !bg-[#D4A574] !text-black hover:!bg-[#c49464]" />
            </div>
          </div>

          <p className="text-center text-gray-500 mt-8 text-sm">
            Start with 5 free generations. No credit card required.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Your audience is waiting.
          </h2>
          <p className="text-xl text-gray-400 mb-8">
            Stop struggling with content. Start growing your brand. 
            Join thousands of creators who&apos;ve made X work for them.
          </p>
          <XSignInButton className="!text-lg !px-8 !py-4" />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-[#D4A574]">xthread</span>
            <span className="text-gray-500 text-sm">— Your voice, amplified.</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <a href="mailto:support@xthread.io" className="hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

function ProblemCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="text-left p-6 rounded-xl bg-white/5 border border-white/10">
      <div className="text-red-400 mb-4">{icon}</div>
      <h3 className="font-semibold mb-2 text-lg">{title}</h3>
      <p className="text-gray-400 text-sm">{description}</p>
    </div>
  )
}

function FeatureRow({ 
  badge, 
  title, 
  description, 
  icon, 
  features, 
  imagePosition 
}: { 
  badge: string
  title: string
  description: string
  icon: React.ReactNode
  features: string[]
  imagePosition: 'left' | 'right'
}) {
  const content = (
    <div className="space-y-6">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4A574]/10 border border-[#D4A574]/20 text-[#D4A574] text-sm">
        {icon}
        <span>{badge}</span>
      </div>
      <h3 className="text-2xl sm:text-3xl font-bold">{title}</h3>
      <p className="text-gray-400 text-lg leading-relaxed">{description}</p>
      <ul className="space-y-3">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-3 text-gray-300">
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
            {feature}
          </li>
        ))}
      </ul>
    </div>
  )

  const image = (
    <div className="rounded-xl bg-white/5 border border-white/10 aspect-video flex items-center justify-center">
      <p className="text-gray-600 text-sm">Feature screenshot/video</p>
    </div>
  )

  return (
    <div className="grid md:grid-cols-2 gap-12 items-center py-16 border-b border-white/5 last:border-0">
      {imagePosition === 'left' ? (
        <>
          <div className="order-2 md:order-1">{image}</div>
          <div className="order-1 md:order-2">{content}</div>
        </>
      ) : (
        <>
          <div>{content}</div>
          <div>{image}</div>
        </>
      )}
    </div>
  )
}

function StepCard({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 rounded-full bg-[#D4A574] text-black font-bold text-xl flex items-center justify-center mx-auto mb-4">
        {number}
      </div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-gray-400 text-sm">{description}</p>
    </div>
  )
}

function PricingFeature({ children, highlight }: { children: React.ReactNode; highlight?: boolean }) {
  return (
    <li className={`flex items-center gap-3 ${highlight ? 'text-[#D4A574]' : 'text-gray-300'}`}>
      <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ${highlight ? 'text-[#D4A574]' : 'text-green-500'}`} />
      {children}
    </li>
  )
}
