import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'
import { FileText, MessageSquare, Calendar, Sparkles } from 'lucide-react'
import Image from 'next/image'

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Image
            src="/logo.svg"
            alt="ThreadSmith"
            width={180}
            height={40}
            className="h-9 w-auto"
            priority
          />
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20">
        <div className="max-w-2xl text-center space-y-8">
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight">
            Your ideas,
            <span className="text-accent"> expertly threaded</span>
          </h1>
          <p className="text-lg text-[var(--muted)] max-w-xl mx-auto">
            Turn your research into engaging X content while keeping your authentic voice.
            Upload notes, generate optimized content with AI, and schedule everything from one place.
          </p>

          <div className="w-full max-w-sm mx-auto">
            <GoogleSignInButton />
          </div>
        </div>

        {/* Features */}
        <div className="mt-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl">
          <FeatureCard
            icon={<FileText className="w-6 h-6" />}
            title="Upload Notes"
            description="Import .docx, .md, and .txt files with your research"
          />
          <FeatureCard
            icon={<MessageSquare className="w-6 h-6" />}
            title="AI Chat"
            description="Generate content ideas optimized for the X algorithm"
          />
          <FeatureCard
            icon={<Sparkles className="w-6 h-6" />}
            title="Rich Editor"
            description="Polish your content with a full-featured workspace"
          />
          <FeatureCard
            icon={<Calendar className="w-6 h-6" />}
            title="Schedule"
            description="Plan and organize your content calendar"
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-6">
        <div className="max-w-6xl mx-auto px-6 text-center text-sm text-[var(--muted)]">
          ThreadSmith - Built for researchers who want to share their work on X
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
    <div className="p-6 rounded-lg bg-[var(--card)] border border-[var(--border)]">
      <div className="text-accent mb-3">{icon}</div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-[var(--muted)]">{description}</p>
    </div>
  )
}
