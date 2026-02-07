-- 1. Add column to track which agent onboarded a restaurant (safely)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restaurants' AND column_name = 'onboarded_by') THEN
        ALTER TABLE public.restaurants ADD COLUMN onboarded_by UUID REFERENCES public.profiles(id);
    END IF;
END $$;

-- 2. Drop existing policies to avoid conflicts/duplication
DROP POLICY IF EXISTS "Agents can view restaurants they onboarded" ON public.restaurants;
DROP POLICY IF EXISTS "Admins can delete restaurants" ON public.restaurants;

-- 3. Update RLS to allow agents to see restaurants they onboarded
CREATE POLICY "Agents can view restaurants they onboarded" ON public.restaurants
  FOR SELECT
  USING (onboarded_by = auth.uid());

-- 4. Allow admins to delete restaurants
CREATE POLICY "Admins can delete restaurants" ON public.restaurants
  FOR DELETE
  USING (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );

-- 5. Ensure Agents can INSERT restaurants (if not already set)
-- (Assuming "Enable insert for authenticated users only" or similar exists, but let's be specific if needed)
-- If you have a restrictive policy, you might need:
-- CREATE POLICY "Agents can insert restaurants" ON public.restaurants FOR INSERT WITH CHECK (auth.role() = 'authenticated');
