-- 1. Anyone can create order items
drop policy if exists "Anyone can create order items" on public.order_items;
create policy "Anyone can create order items" on public.order_items 
for insert with check (true);

-- 2. Owners can view items for their restaurant's orders
drop policy if exists "Owners view restaurant order items" on public.order_items;
create policy "Owners view restaurant order items" on public.order_items
for select using (
  exists (
    select 1 from public.orders o
    join public.restaurants r on o.restaurant_id = r.id
    where o.id = order_items.order_id and r.owner_id = auth.uid()
  )
);
