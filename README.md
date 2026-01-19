# ThreadSmith

Your ideas, expertly threaded. Turn your research into engaging X content while keeping your authentic voice.

## Tech Stack

- **Framework**: Next.js 14 (App Router, TypeScript)
- **Styling**: Tailwind CSS
- **Database/Auth/Storage**: Supabase (Postgres, Google OAuth, File Storage)
- **AI**: Claude API
- **Rich Text Editor**: Tiptap
- **Calendar**: react-big-calendar

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in the required values:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
```

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new).
