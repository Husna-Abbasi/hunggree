-- Add onboarding fields to restaurants
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'restaurant_status') THEN
        CREATE TYPE restaurant_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');
    END IF;
END $$;

ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS onboarding_status restaurant_status DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS admin_notes text;

-- Update existing restaurants to 'approved' so we don't break current users
UPDATE public.restaurants SET onboarding_status = 'approved' WHERE onboarding_status IS NULL;

-- Ensure is_active is false for pending restaurants
UPDATE public.restaurants SET is_active = false WHERE onboarding_status = 'pending';

-- RLS Update: Only admins can change status
DROP POLICY IF EXISTS "Owners can update own restaurant" ON public.restaurants;
CREATE POLICY "Owners can update own restaurant" ON public.restaurants 
FOR UPDATE USING (owner_id = auth.uid())
WITH CHECK (
    -- Prevent non-admins from changing onboarding_status
    (
        SELECT role FROM public.profiles WHERE id = auth.uid()
    ) = 'admin' 
    OR 
    (
        onboarding_status = (SELECT onboarding_status FROM public.restaurants WHERE id = restaurants.id)
    )
);
