-- Grant Admins full access to all tables
-- This ensures Admins can view and manage ALL restaurants, items, etc.

-- Restaurants
CREATE POLICY "Admins manage all restaurants" 
ON public.restaurants 
FOR ALL 
USING (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Categories
CREATE POLICY "Admins manage all categories" 
ON public.categories 
FOR ALL 
USING (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Items
CREATE POLICY "Admins manage all items" 
ON public.items 
FOR ALL 
USING (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Orders
CREATE POLICY "Admins manage all orders" 
ON public.orders 
FOR ALL 
USING (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Profiles (View all profiles)
CREATE POLICY "Admins view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
