# X Content Partner

## Project Overview
A web app that helps researchers turn their notes into optimized X/Twitter content. Users upload research files (.docx, .md, .txt), chat with AI to generate tweets/threads/articles, then organize content in a calendar/scheduler.

## Tech Stack
- **Framework**: Next.js 14 (App Router, TypeScript)
- **Styling**: Tailwind CSS
- **Database/Auth/Storage**: Supabase (Postgres, Google OAuth, File Storage)
- **AI**: Claude API (claude-sonnet-4-20250514)
- **Rich Text Editor**: Tiptap
- **Calendar**: react-big-calendar + custom list view

## Design System
Minimal, clean UI inspired by claude.ai:
- Dark mode default (neutral-900 background), light mode optional
- Accent color: Subtle blue (#3b82f6) for interactive elements
- Font: System font stack for performance, or Geist if available
- Rounded corners (8px default), subtle shadows
- Smooth transitions (150ms ease)
- Generous whitespace, no clutter

## Core Features

### 1. Authentication
- Google sign-in via Supabase Auth
- Protected routes (dashboard, workspace, settings)
- Redirect unauthenticated users to landing page

### 2. File Management (Left Sidebar)
- Upload .docx, .md, .txt files
- Display list of user's files with name, date, file type icon
- Click to preview content
- Delete files
- Files stored in Supabase Storage, extracted text in Postgres

### 3. AI Chat Interface (Main Area)
- Claude-like chat UI with message bubbles
- Content type selector: Tweet | Thread | Article (pill buttons above input)
- Context toggle: "Use all files" checkbox OR "Attach file" button to select specific file(s)
- User types prompt like "generate 3 thread ideas about Solana using my notes"
- Stream Claude's response
- Each generated option has "Copy to Workspace" button

### 4. Workspace (Separate Page)
- Tiptap rich text editor (bold, italic, underline, links)
- Live preview panel showing how content looks on X:
  - Tweet: character count (280/4000), warning if over
  - Thread: numbered tweets, each with character count
  - Article: formatted long-form preview
- "Save as Draft" and "Schedule" buttons
- Schedule modal: date picker, optional time picker

### 5. Content Calendar (Workspace Page)
- Toggle between Calendar view and List view
- Calendar: monthly view, posts shown on their scheduled dates
- List: chronological list with status badges (draft, scheduled, posted)
- Click post to edit in workspace
- Drag-and-drop to reschedule (calendar view)

### 6. Settings Page
- Notification preferences (email notifications toggle)
- Theme toggle (dark/light)
- Account info

## X Algorithm Optimization
Reference `/docs/x-algorithm-guide.md` for all content generation. The AI must:
- Structure content as Hook → Value → CTA
- Warn if external links detected in main tweet
- Suggest image placement points in threads
- Show character counts with visual indicator (green/yellow/red)
- For threads: number each tweet, ensure each can stand alone
- Score content against algorithm factors (show engagement potential)

## File Parsing
- **.docx**: Use mammoth.js to extract text/HTML
- **.md**: Read as plain text, preserve formatting
- **.txt**: Read as plain text

## Database Schema

```sql
-- Users table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  settings jsonb default '{"notifications": true, "theme": "dark"}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Files table
create table public.files (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  name text not null,
  file_type text not null,
  content text,
  storage_path text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Posts table
create table public.posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  type text not null check (type in ('tweet', 'thread', 'article')),
  title text,
  content jsonb not null,
  status text default 'draft' check (status in ('draft', 'scheduled', 'posted')),
  scheduled_date date,
  scheduled_time time,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Conversations table (chat history)
create table public.conversations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  messages jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- RLS policies
alter table public.profiles enable row level security;
alter table public.files enable row level security;
alter table public.posts enable row level security;
alter table public.conversations enable row level security;

create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

create policy "Users can CRUD own files" on public.files for all using (auth.uid() = user_id);
create policy "Users can CRUD own posts" on public.posts for all using (auth.uid() = user_id);
create policy "Users can CRUD own conversations" on public.conversations for all using (auth.uid() = user_id);

-- Function to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

## API Routes

### POST /api/chat
- Body: { message, contentType, useAllFiles, selectedFileIds, conversationId }
- Streams Claude response
- Saves to conversations table

### GET /api/files
- Returns user's files

### POST /api/files
- Multipart form upload
- Parse file, extract text
- Store in Supabase Storage + save metadata to Postgres

### DELETE /api/files/[id]
- Delete file from storage and database

### GET /api/posts
- Query params: status, startDate, endDate
- Returns user's posts

### POST /api/posts
- Create or update post

### DELETE /api/posts/[id]
- Delete post

## Claude System Prompt for Content Generation

```
You are an X/Twitter content optimization assistant. Your job is to help users turn their research notes into engaging X content.

IMPORTANT: Reference the X algorithm guide when generating content:
- Structure: Hook (attention-grabbing first line) → Value (main insight) → CTA (question or engagement prompt)
- Replies are worth 150x more than likes when author engages back
- Warn if content contains external links (suggest putting in reply instead)
- For threads: number each tweet, each should stand alone, suggest image placement every 3-4 tweets
- Optimal thread length: 5-15 tweets
- End threads with discussion prompts

When generating options:
1. Present 2-4 distinct angles/approaches
2. Explain why each would perform well algorithmically
3. Use the user's voice and terminology from their notes
4. Fix grammar/structure but preserve their authentic style

Content type guidelines:
- Tweet: 280 chars (or 4000 for long-form), punchy, one key insight
- Thread: 5-15 tweets, numbered, comprehensive breakdown
- Article: Long-form (1000-2000 words), subheadings, data-driven

Always consider:
- What hook will stop the scroll?
- What's the one insight people will remember?
- What question will spark replies?
```

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
```

## Build Order
1. Initialize Next.js with TypeScript and Tailwind
2. Set up Supabase client and auth
3. Create database schema (run SQL in Supabase dashboard)
4. Build landing page with Google sign-in
5. Build dashboard layout (sidebar + main area)
6. Implement file upload and listing
7. Build chat interface with Claude streaming
8. Build workspace with Tiptap editor
9. Add X preview components (tweet, thread, article)
10. Build calendar and list views
11. Add scheduling functionality
12. Build settings page
13. Polish: loading states, error handling, transitions

## Key Implementation Notes

### Streaming with Claude
Use the Anthropic SDK with streaming:
```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

const stream = await anthropic.messages.stream({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 4096,
  system: SYSTEM_PROMPT,
  messages: [{ role: 'user', content: userMessage }]
});

for await (const chunk of stream) {
  // Send chunk to client via SSE or websocket
}
```

### File Upload with Supabase
```typescript
// Upload to storage
const { data, error } = await supabase.storage
  .from('files')
  .upload(`${userId}/${fileName}`, file);

// Save metadata to database
await supabase.from('files').insert({
  user_id: userId,
  name: fileName,
  file_type: fileType,
  content: extractedText,
  storage_path: data.path
});
```

### Tiptap Setup
```typescript
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';

const editor = useEditor({
  extensions: [StarterKit, Link],
  content: initialContent,
});
```

## Testing Checklist
- [ ] Google sign-in works
- [ ] File upload extracts text correctly (.docx, .md, .txt)
- [ ] Chat sends message and streams response
- [ ] "Copy to Workspace" transfers content
- [ ] Editor saves rich text
- [ ] Character count updates live
- [ ] Thread preview numbers tweets correctly
- [ ] Calendar displays scheduled posts
- [ ] List view filters by status
- [ ] Drag-and-drop rescheduling works
- [ ] Settings persist
