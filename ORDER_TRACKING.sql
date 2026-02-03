-- Add order_count to items table
alter table public.items add column if not exists order_count integer default 0;

-- Function to increment order_count
create or replace function public.increment_item_order_count()
returns trigger as $$
begin
  update public.items
  set order_count = order_count + new.quantity
  where id = new.item_id;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call the function on order_item insertion
drop trigger if exists on_order_item_created on public.order_items;
create trigger on_order_item_created
  after insert on public.order_items
  for each row execute function public.increment_item_order_count();
