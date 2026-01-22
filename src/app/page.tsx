import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'
import { TrendingUp, Sparkles, Calendar, Mic } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)]">
      {/* Header */}
      <header className="border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-sand">xthread</span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 sm:py-20">
        <div className="max-w-3xl text-center space-y-6">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
            Grow Your X Audience with{' '}
            <span className="text-sand">Algorithm-Optimized Content</span>
          </h1>
          <p className="text-lg sm:text-xl text-[var(--muted)] max-w-2xl mx-auto leading-relaxed">
            Generate viral posts in seconds. Our AI creates Scroll Stoppers, Debate Starters,
            and Viral Catalysts designed to maximize engagement.
          </p>

          {/* CTA Section */}
          <div className="pt-4 space-y-4">
            <p className="text-sm text-[var(--foreground-muted)] font-medium">
              Get Started Free
            </p>
            <div className="w-full max-w-md mx-auto">
              <GoogleSignInButton variant="prominent" />
            </div>
            <p className="text-xs text-[var(--muted)]">
              No credit card required • 5 free generations
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="mt-20 sm:mt-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl w-full">
          <FeatureCard
            icon={<TrendingUp className="w-6 h-6" />}
            title="Algorithm-Optimized Posts"
            description="Generate posts engineered for maximum reach. Our AI understands what makes content go viral."
          />
          <FeatureCard
            icon={<Sparkles className="w-6 h-6" />}
            title="3 Post Types That Work"
            description="Scroll Stoppers for attention, Debate Starters for replies, Viral Catalysts for shares."
          />
          <FeatureCard
            icon={<Calendar className="w-6 h-6" />}
            title="Smart Scheduling"
            description="Plan your content calendar and post at optimal times for your audience."
          />
          <FeatureCard
            icon={<Mic className="w-6 h-6" />}
            title="Voice Preservation"
            description="Upload your notes and research. We generate content that sounds like you, not a robot."
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-6">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-[var(--muted)]">
          xthread — Grow your X audience with AI-powered content
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="p-6 rounded-xl bg-[var(--card)] border border-[var(--border)] hover:border-sand/30 transition-colors">
      <div className="text-sand mb-4">{icon}</div>
      <h3 className="font-semibold mb-2 text-[var(--foreground)]">{title}</h3>
      <p className="text-sm text-[var(--muted)] leading-relaxed">{description}</p>
    </div>
  )
}
