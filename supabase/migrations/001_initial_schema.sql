-- X Content Partner Database Schema
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- Enable UUID extension (usually already enabled)
create extension if not exists "uuid-ossp";

-- Profiles table (extends Supabase auth.users)
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

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.files enable row level security;
alter table public.posts enable row level security;
alter table public.conversations enable row level security;

-- RLS Policies for profiles
create policy "Users can view own profile" 
  on public.profiles for select 
  using (auth.uid() = id);

create policy "Users can update own profile" 
  on public.profiles for update 
  using (auth.uid() = id);

create policy "Users can insert own profile" 
  on public.profiles for insert 
  with check (auth.uid() = id);

-- RLS Policies for files
create policy "Users can view own files" 
  on public.files for select 
  using (auth.uid() = user_id);

create policy "Users can insert own files" 
  on public.files for insert 
  with check (auth.uid() = user_id);

create policy "Users can update own files" 
  on public.files for update 
  using (auth.uid() = user_id);

create policy "Users can delete own files" 
  on public.files for delete 
  using (auth.uid() = user_id);

-- RLS Policies for posts
create policy "Users can view own posts" 
  on public.posts for select 
  using (auth.uid() = user_id);

create policy "Users can insert own posts" 
  on public.posts for insert 
  with check (auth.uid() = user_id);

create policy "Users can update own posts" 
  on public.posts for update 
  using (auth.uid() = user_id);

create policy "Users can delete own posts" 
  on public.posts for delete 
  using (auth.uid() = user_id);

-- RLS Policies for conversations
create policy "Users can view own conversations" 
  on public.conversations for select 
  using (auth.uid() = user_id);

create policy "Users can insert own conversations" 
  on public.conversations for insert 
  with check (auth.uid() = user_id);

create policy "Users can update own conversations" 
  on public.conversations for update 
  using (auth.uid() = user_id);

create policy "Users can delete own conversations" 
  on public.conversations for delete 
  using (auth.uid() = user_id);

-- Function to automatically create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call the function on new user creation
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create storage bucket for user files
insert into storage.buckets (id, name, public)
values ('user-files', 'user-files', false)
on conflict (id) do nothing;

-- Storage policies
create policy "Users can upload own files"
  on storage.objects for insert
  with check (bucket_id = 'user-files' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can view own files"
  on storage.objects for select
  using (bucket_id = 'user-files' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can delete own files"
  on storage.objects for delete
  using (bucket_id = 'user-files' and auth.uid()::text = (storage.foldername(name))[1]);

-- Indexes for better query performance
create index idx_files_user_id on public.files(user_id);
create index idx_posts_user_id on public.posts(user_id);
create index idx_posts_status on public.posts(status);
create index idx_posts_scheduled_date on public.posts(scheduled_date);
create index idx_conversations_user_id on public.conversations(user_id);
