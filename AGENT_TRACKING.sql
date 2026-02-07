-- Add column to track which agent onboarded a restaurant
ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS onboarded_by UUID REFERENCES public.profiles(id);

-- Update RLS to allow agents to see restaurants they onboarded
CREATE POLICY "Agents can view restaurants they onboarded" ON public.restaurants
  FOR SELECT
  USING (onboarded_by = auth.uid());
