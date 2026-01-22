-- Subscriptions and Usage Tracking Schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- Subscriptions table
create table if not exists public.subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles on delete cascade not null unique,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text default 'pending' check (status in ('pending', 'active', 'lifetime', 'cancelled', 'past_due')),
  plan_type text check (plan_type in ('monthly', 'lifetime')),
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Generation usage tracking table
create table if not exists public.generation_usage (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  generation_id uuid not null,
  source_type text check (source_type in ('topic', 'file')),
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable Row Level Security
alter table public.subscriptions enable row level security;
alter table public.generation_usage enable row level security;

-- RLS Policies for subscriptions
create policy "Users can view own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

create policy "Users can insert own subscription"
  on public.subscriptions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own subscription"
  on public.subscriptions for update
  using (auth.uid() = user_id);

-- RLS Policies for generation_usage
create policy "Users can view own generation usage"
  on public.generation_usage for select
  using (auth.uid() = user_id);

create policy "Users can insert own generation usage"
  on public.generation_usage for insert
  with check (auth.uid() = user_id);

-- Indexes for better query performance
create index if not exists idx_subscriptions_user_id on public.subscriptions(user_id);
create index if not exists idx_subscriptions_stripe_customer_id on public.subscriptions(stripe_customer_id);
create index if not exists idx_generation_usage_user_id on public.generation_usage(user_id);
create index if not exists idx_generation_usage_created_at on public.generation_usage(created_at);
