-- Allow agents to UPDATE restaurants they onboarded (needed for dashboard management)
CREATE POLICY "Agents can update their onboarded restaurants" ON public.restaurants
  FOR UPDATE
  USING (onboarded_by = auth.uid());

-- Allow agents to VIEW/INSERT/UPDATE/DELETE menu items for their restaurants
-- (We need to check how menu items are linked. Usually via restaurant_id)
-- Simple approach: If the user can update the restaurant, they can manage its items.

CREATE POLICY "Agents can manage menu items" ON public.items
  FOR ALL
  USING (
    exists (
      select 1 from public.restaurants
      where restaurants.id = items.restaurant_id
      and restaurants.onboarded_by = auth.uid()
    )
  );

CREATE POLICY "Agents can manage categories" ON public.categories
  FOR ALL
  USING (
    exists (
      select 1 from public.restaurants
      where restaurants.id = categories.restaurant_id
      and restaurants.onboarded_by = auth.uid()
    )
  );
