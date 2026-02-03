-- MIGRATION: Drop old tables and recreate with new structure
-- Run this FIRST if you have existing tables

-- Drop in reverse dependency order
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.items CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.menus CASCADE;
DROP TABLE IF EXISTS public.restaurants CASCADE;
-- Note: Don't drop profiles as it contains user data

-- Now run SCHEMA.sql after this
