-- SQL script to add variations column to items table
-- Variations will be stored as an array of JSON objects: [{"name": "Small", "price": 9.99}]

ALTER TABLE public.items ADD COLUMN IF NOT EXISTS variations jsonb DEFAULT '[]'::jsonb;
