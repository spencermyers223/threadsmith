# xthread

**AI-powered content for tech Twitter.** Generate algorithm-optimized posts in your voice.

🌐 **Live:** [xthread.io](https://xthread.io)

---

## Features

- **🎯 Algorithm Score** — Know if your post will perform before you hit send
- **🔬 Tech Niche Focus** — AI trained specifically for AI, crypto, biotech, dev Twitter
- **🎤 Voice Training** — Import your tweets, train the AI to sound like you
- **📅 Content Calendar** — Plan and schedule a week of content in minutes
- **✍️ 6 Post Types** — Alpha threads, hot takes, market analysis, and more
- **📁 Research Vault** — Store notes and generate posts from your research

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router, TypeScript) |
| Styling | Tailwind CSS |
| Database | Supabase (Postgres) |
| Auth | Supabase Auth (Google OAuth) |
| Storage | Supabase Storage |
| AI | Anthropic Claude API |
| Editor | Tiptap |
| Calendar | react-big-calendar |
| Payments | Stripe |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm/yarn/pnpm
- Supabase account
- Anthropic API key
- Stripe account (for payments)

### 1. Clone and Install

```bash
git clone https://github.com/spencermyers223/threadsmith.git
cd threadsmith
npm install
```

### 2. Environment Setup

Copy the example env file and fill in your credentials:

```bash
cp .env.local.example .env.local
```

Required environment variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_PRICE_ID=price_...
STRIPE_ANNUAL_PRICE_ID=price_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Database Setup

Run the Supabase migrations:

```bash
# Via Supabase CLI
supabase db push

# Or run the SQL files in supabase/migrations/ manually
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── auth/              # Auth pages
│   ├── calendar/          # Content calendar
│   ├── creator-hub/       # Main workspace (generate + write)
│   ├── pricing/           # Pricing page
│   ├── settings/          # User settings + voice training
│   └── workspace/         # Draft editing
├── components/            # React components
│   ├── auth/             # Auth components
│   ├── calendar/         # Calendar components
│   ├── creator-hub/      # Generate + Write modes
│   ├── generate/         # File sidebar, generation
│   ├── preview/          # Tweet/thread previews
│   ├── tags/             # Tag management
│   └── workspace/        # Draft editing components
├── lib/                   # Utilities
│   ├── ai/               # AI prompt engineering
│   ├── supabase/         # Supabase client
│   └── stripe.ts         # Stripe config
└── types/                 # TypeScript types

docs/                      # Documentation
├── README.md             # Docs index
├── content_playbook.md   # Marketing strategy
├── ct_template_library.md # Post templates
├── competitive_analysis.md # Competitor research
└── feature-specs/        # Feature specifications

public/
├── branding/             # Brand assets (SVG)
└── ...                   # Static assets

supabase/
└── migrations/           # Database migrations
```

---

## Key Components

### Generation Flow
1. User selects post type (Alpha Thread, Hot Take, etc.)
2. Enters topic and optional context
3. AI generates 3 variations using Claude
4. User selects, edits, and posts

### Voice Training
1. User pastes 10-20 of their past tweets
2. AI analyzes writing patterns
3. Voice profile stored in `content_profiles`
4. All generations use the trained voice

### Subscription Flow
1. Stripe handles checkout
2. Webhook updates `subscriptions` table
3. `subscription_tier` column controls access
4. Free tier: 5 generations, paid: unlimited

---

## Development

### Commands

```bash
npm run dev       # Start dev server
npm run build     # Production build
npm run lint      # Run ESLint
npm run test      # Run tests (if configured)
```

### Code Style

- TypeScript strict mode
- ESLint with Next.js config
- Prettier for formatting
- Conventional commits

---

## Deployment

### Vercel (Recommended)

1. Connect repo to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy

Auto-deploys on push to `main`.

### Manual

```bash
npm run build
npm start
```

---

## Documentation

See the [docs/](./docs/README.md) folder for:
- Marketing strategy and content playbook
- Competitive analysis
- Feature specifications
- Post templates

---

## License

Proprietary. All rights reserved.

---

## Support

- **Issues:** GitHub Issues
- **Contact:** spencer@xthread.io
