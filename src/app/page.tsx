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
            Tech Twitter content{' '}
            <span className="text-sand">that performs.</span>
          </h1>
          <p className="text-lg sm:text-xl text-[var(--muted)] max-w-2xl mx-auto leading-relaxed">
            Create algorithm-optimized posts for AI, crypto, biotech, and dev Twitter. Train the AI on your writing style. Know if your content will perform before you hit post.
          </p>

          {/* CTA Section */}
          <div className="pt-4 space-y-4">
            <p className="text-sm text-[var(--foreground-muted)] font-medium">
              Start Creating for Free
            </p>
            <div className="w-full max-w-md mx-auto">
              <GoogleSignInButton variant="prominent" />
            </div>
            <div className="flex flex-wrap justify-center gap-4 text-xs text-[var(--muted)]">
              <span className="flex items-center gap-1">
                <span className="text-green-500">✓</span> 5 free generations
              </span>
              <span className="flex items-center gap-1">
                <span className="text-green-500">✓</span> No credit card
              </span>
              <span className="flex items-center gap-1">
                <span className="text-green-500">✓</span> Train on your style
              </span>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-20 sm:mt-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl w-full">
          <FeatureCard
            icon={<TrendingUp className="w-6 h-6" />}
            title="Algorithm Score"
            description="Know before you post. Our scoring engine analyzes hooks, length, and engagement triggers so you never waste a tweet."
          />
          <FeatureCard
            icon={<Sparkles className="w-6 h-6" />}
            title="Built for Tech Twitter"
            description="AI that speaks your niche. Whether you're covering GPT-5, Solana, or quantum computing — content that resonates."
          />
          <FeatureCard
            icon={<Calendar className="w-6 h-6" />}
            title="Content Calendar"
            description="Plan a week of content in 15 minutes. Color-coded calendar, one-click posting, never miss a day."
          />
          <FeatureCard
            icon={<Mic className="w-6 h-6" />}
            title="Voice Training"
            description="Sound like you, not a robot. Paste your past tweets, tweak the settings, and every generation matches your voice."
          />
        </div>

        {/* Social Proof / Tech Focus */}
        <div className="mt-20 text-center">
          <p className="text-sm text-[var(--muted)] mb-4">Built for creators covering</p>
          <div className="flex flex-wrap justify-center gap-3">
            {['AI / ML', 'Crypto / Web3', 'Robotics', 'Biotech', 'Space', 'Climate Tech', 'Fintech', 'Developer Tools'].map((niche) => (
              <span 
                key={niche}
                className="px-3 py-1.5 rounded-full bg-[var(--card)] border border-[var(--border)] text-sm text-[var(--foreground)]"
              >
                {niche}
              </span>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-6">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-[var(--muted)]">
          xthread — Write smarter about the technology shaping the future
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
