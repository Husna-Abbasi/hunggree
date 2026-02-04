-- Fix for "Infinite Recursion" error
-- This happens because querying 'profiles' from within a 'restaurants' policy triggers RLS on 'profiles',
-- which might be circularly checking 'restaurants' or causing a loop.
-- Solution: Use a SECURITY DEFINER function to check admin status. This bypasses RLS on 'profiles'.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER -- Runs as the creator (superuser), bypassing RLS on tables it accesses
SET search_path = public -- Security best practice
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
$$;

-- Now update the policies to use this function

-- Restaurants
DROP POLICY IF EXISTS "Admins can update any restaurant" ON public.restaurants;

CREATE POLICY "Admins can update any restaurant"
ON public.restaurants
FOR UPDATE
USING (
  public.is_admin()
);

DROP POLICY IF EXISTS "Admins can view all restaurants" ON public.restaurants;
CREATE POLICY "Admins can view all restaurants"
ON public.restaurants
FOR SELECT
USING (
  public.is_admin()
);

-- Profiles (Prevent recursion here too if any)
DROP POLICY IF EXISTS "Admins view all profiles" ON public.profiles;
CREATE POLICY "Admins view all profiles"
ON public.profiles
FOR SELECT
USING (
  public.is_admin()
);

-- Registration Requests
DROP POLICY IF EXISTS "Admins can view registration requests" ON public.registration_requests;
CREATE POLICY "Admins can view registration requests" 
ON public.registration_requests 
FOR SELECT 
USING ( public.is_admin() );

DROP POLICY IF EXISTS "Admins can update registration requests" ON public.registration_requests;
CREATE POLICY "Admins can update registration requests" 
ON public.registration_requests 
FOR UPDATE
USING ( public.is_admin() );
