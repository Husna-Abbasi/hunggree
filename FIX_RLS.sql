-- 1. First, enable RLS (it should already be enabled, but just in case)
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts or duplicates
-- We use "IF EXISTS" so this script doesn't fail if they don't exist
DROP POLICY IF EXISTS "Owners can update their own restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Admins can update any restaurant" ON public.restaurants;
DROP POLICY IF EXISTS "Admins manage all restaurants" ON public.restaurants;

-- 3. Re-create the "Owner" policy (users can update ONLY if they own the record)
CREATE POLICY "Owners can update their own restaurants"
ON public.restaurants
FOR UPDATE
USING (auth.uid() = owner_id);

-- 4. Create the "Admin" policy (Admins can update ANY record)
-- This checks if the current user has the 'admin' role in the 'profiles' table
CREATE POLICY "Admins can update any restaurant"
ON public.restaurants
FOR UPDATE
USING (
  exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role = 'admin'
  )
);

-- 5. Also ensure Admins can SELECT (view) everything
DROP POLICY IF EXISTS "Admins can view all restaurants" ON public.restaurants;
CREATE POLICY "Admins can view all restaurants"
ON public.restaurants
FOR SELECT
USING (
  exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role = 'admin'
  )
);
