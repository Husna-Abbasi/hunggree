-- Add member_name column to loyalty_cards table
-- Run this in Supabase SQL Editor

ALTER TABLE public.loyalty_cards 
ADD COLUMN IF NOT EXISTS member_name text;

-- Optional: Update existing cards to fix the google_object_id format
-- This removes the double ISSUER_ID prefix issue
-- UPDATE public.loyalty_cards 
-- SET google_object_id = restaurant_id || '-user-' || user_id::text
-- WHERE google_object_id LIKE '%.%-user-%';
