-- Migration: Add writing_assistant_mode column to conversations table
-- Run this in your Supabase SQL Editor

-- Add writing_assistant_mode column to conversations table
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS writing_assistant_mode boolean DEFAULT false;

-- Create an index for faster querying of writing assistant conversations
CREATE INDEX IF NOT EXISTS idx_conversations_writing_assistant_mode
ON public.conversations(user_id, writing_assistant_mode);
