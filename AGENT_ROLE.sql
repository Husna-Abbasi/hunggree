-- ==========================================
-- AGENT ROLE MIGRATION
-- ==========================================

-- 1. Update profiles check constraint to include 'agent'
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'restaurant_owner', 'customer', 'agent'));

-- 2. Create 'is_agent' helper function (like is_admin)
create or replace function public.is_agent()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'agent'
  );
$$;

-- 3. RLS: Allow Agents to view all restaurants (to check duplicates?)
--    Actually, Agents mainly need to INSERT (create) restaurants.
--    And maybe view the ones they created? For now, let's allow them to Create.

-- Restaurants: Agents can insert active/approved restaurants directly
CREATE POLICY "Agents can create restaurants" ON public.restaurants 
FOR INSERT 
WITH CHECK (public.is_agent());

-- Agents can view all restaurants (read-only)
CREATE POLICY "Agents can view all restaurants" ON public.restaurants 
FOR SELECT 
USING (public.is_agent());

-- 4. RLS: Profiles (Owner creation)
-- Agents need to be able to create profile rows for the Owners they onboard due to the trigger?
-- Actually, the `handle_new_user` trigger runs as SECURITY DEFINER, so it bypasses RLS.
-- But if the API uses `supabaseAdmin`, we technically don't need RLS for the API actions if we use the service role.
-- However, if we use the client-side, we need RLS.

-- Since the `onboard` API will essentially act with elevated privileges (Admin Client),
-- we might not strictly need new RLS policies for *everything* if the API handles it.
-- BUT, it's good practice to have the role defined.

-- Let's stick to the constraint update mostly.
