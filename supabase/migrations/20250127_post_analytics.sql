-- Post Analytics table for manual performance tracking
create table if not exists public.post_analytics (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  post_id uuid references public.posts(id) on delete set null,
  tweet_url text,
  tweet_id text,
  impressions integer default 0,
  likes integer default 0,
  replies integer default 0,
  retweets integer default 0,
  quotes integer default 0,
  bookmarks integer default 0,
  profile_clicks integer default 0,
  followers_gained integer default 0,
  recorded_at timestamptz not null default now(),
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.post_analytics enable row level security;

-- RLS Policies
create policy "Users can view own analytics"
  on public.post_analytics for select
  using (auth.uid() = user_id);

create policy "Users can insert own analytics"
  on public.post_analytics for insert
  with check (auth.uid() = user_id);

create policy "Users can update own analytics"
  on public.post_analytics for update
  using (auth.uid() = user_id);

create policy "Users can delete own analytics"
  on public.post_analytics for delete
  using (auth.uid() = user_id);

-- Indexes
create index idx_post_analytics_user_id on public.post_analytics(user_id);
create index idx_post_analytics_recorded_at on public.post_analytics(recorded_at);
create index idx_post_analytics_tweet_id on public.post_analytics(tweet_id);
