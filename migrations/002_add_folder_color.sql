-- Migration: Add color column to folders table
-- Run this in your Supabase SQL Editor if you already ran 001_add_folders.sql

-- Add color column to folders table (if it doesn't exist)
ALTER TABLE public.folders
ADD COLUMN IF NOT EXISTS color text DEFAULT 'yellow';
