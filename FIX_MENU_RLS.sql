-- Fix RLS for Menu Management (Categories and Items)

-- 1. Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

-- 2. Clean up old policies
DROP POLICY IF EXISTS "Owners can manage categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
DROP POLICY IF EXISTS "Public can view categories" ON public.categories;
DROP POLICY IF EXISTS "Everyone can view categories" ON public.categories;
DROP POLICY IF EXISTS "Users can insert categories" ON public.categories;

DROP POLICY IF EXISTS "Owners can manage items" ON public.items;
DROP POLICY IF EXISTS "Admins can manage items" ON public.items;
DROP POLICY IF EXISTS "Public can view items" ON public.items;
DROP POLICY IF EXISTS "Everyone can view items" ON public.items;
DROP POLICY IF EXISTS "Users can insert items" ON public.items;

-- 3. Define Policies for Categories

-- Admin Full Access
CREATE POLICY "Admins can manage categories"
ON public.categories
FOR ALL
USING ( public.is_admin() );

-- Owner Full Access (indirect check via restaurant)
CREATE POLICY "Owners can manage categories"
ON public.categories
FOR ALL
USING (
  exists (
    select 1 from public.restaurants
    where id = categories.restaurant_id
    and owner_id = auth.uid()
  )
)
WITH CHECK (
  exists (
    select 1 from public.restaurants
    where id = categories.restaurant_id
    and owner_id = auth.uid()
  )
);

-- Public Read Access (for menu viewing)
CREATE POLICY "Public can view categories"
ON public.categories
FOR SELECT
USING (true);


-- 4. Define Policies for Items

-- Admin Full Access
CREATE POLICY "Admins can manage items"
ON public.items
FOR ALL
USING ( public.is_admin() );

-- Owner Full Access
CREATE POLICY "Owners can manage items"
ON public.items
FOR ALL
USING (
  exists (
    select 1 from public.restaurants
    where id = items.restaurant_id
    and owner_id = auth.uid()
  )
)
WITH CHECK (
  exists (
    select 1 from public.restaurants
    where id = items.restaurant_id
    and owner_id = auth.uid()
  )
);

-- Public Read Access
CREATE POLICY "Public can view items"
ON public.items
FOR SELECT
USING (true);
