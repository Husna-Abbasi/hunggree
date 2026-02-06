-- Pass Designer Schema Updates
-- Run this in Supabase SQL Editor

-- Add design columns to loyalty_programs
ALTER TABLE public.loyalty_programs 
ADD COLUMN IF NOT EXISTS wide_logo_url text,
ADD COLUMN IF NOT EXISTS background_color text DEFAULT '#1a1a1a';

-- hero_image_url already exists from initial schema
