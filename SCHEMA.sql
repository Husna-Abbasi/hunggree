-- Database Schema for Restaurant Menu App (Supabase)
-- SIMPLIFIED VERSION: Restaurant -> Categories -> Items

-- 1. Users (Extends auth.users)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade not null primary key,
  email text,
  full_name text,
  avatar_url text,
  role text default 'customer' check (role in ('admin', 'restaurant_owner', 'customer')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Restaurants
create table if not exists public.restaurants (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references public.profiles(id) not null,
  name text not null,
  slug text unique not null,
  description text,
  address text,
  phone text,
  whatsapp_number text not null,
  logo_url text,
  cover_image_url text,
  currency text default 'USD',
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. Categories (Starters, Mains, etc.) - Directly linked to Restaurant
create table if not exists public.categories (
  id uuid default gen_random_uuid() primary key,
  restaurant_id uuid references public.restaurants(id) on delete cascade not null,
  name text not null,
  description text,
  image_url text,
  display_order int default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 4. Items (Dishes)
create table if not exists public.items (
  id uuid default gen_random_uuid() primary key,
  restaurant_id uuid references public.restaurants(id) on delete cascade not null,
  category_id uuid references public.categories(id) on delete cascade not null,
  name text not null,
  description text,
  price decimal(10, 2) not null,
  image_url text,
  is_available boolean default true,
  is_vegetarian boolean default false,
  is_spicy boolean default false,
  calories int,
  display_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 5. Orders
create table if not exists public.orders (
  id uuid default gen_random_uuid() primary key,
  restaurant_id uuid references public.restaurants(id) on delete cascade not null,
  customer_id uuid references public.profiles(id),
  table_number text,
  status text default 'pending' check (status in ('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled')),
  total_amount decimal(10, 2) not null,
  payment_status text default 'unpaid',
  payment_method text,
  notes text,
  whatsapp_message_sent boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 6. Order Items
create table if not exists public.order_items (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  item_id uuid references public.items(id) not null,
  quantity int not null default 1,
  price_at_time decimal(10, 2) not null,
  notes text,
  options jsonb
);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.restaurants enable row level security;
alter table public.categories enable row level security;
alter table public.items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Drop existing policies if they exist (to avoid errors on re-run)
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Public view active restaurants" on public.restaurants;
drop policy if exists "Owners manage own restaurants" on public.restaurants;
drop policy if exists "Public view categories" on public.categories;
drop policy if exists "Owners manage categories" on public.categories;
drop policy if exists "Public view items" on public.items;
drop policy if exists "Owners manage items" on public.items;
drop policy if exists "Owners view restaurant orders" on public.orders;
drop policy if exists "Customer view own orders" on public.orders;
drop policy if exists "Anyone can create order" on public.orders;

-- Profiles RLS
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Restaurants RLS
create policy "Public view active restaurants" on public.restaurants for select using (is_active = true);
create policy "Owners manage own restaurants" on public.restaurants for all using (auth.uid() = owner_id);

-- Categories RLS (Public can view, owners can manage)
create policy "Public view categories" on public.categories for select using (true);
create policy "Owners manage categories" on public.categories for all using (
  exists (select 1 from public.restaurants where id = categories.restaurant_id and owner_id = auth.uid())
);

-- Items RLS (Public can view, owners can manage)
create policy "Public view items" on public.items for select using (true);
create policy "Owners manage items" on public.items for all using (
  exists (select 1 from public.restaurants where id = items.restaurant_id and owner_id = auth.uid())
);

-- Orders RLS
create policy "Owners view restaurant orders" on public.orders for select using (
  exists (select 1 from public.restaurants where id = orders.restaurant_id and owner_id = auth.uid())
);
create policy "Customer view own orders" on public.orders for select using (auth.uid() = customer_id);
create policy "Anyone can create order" on public.orders for insert with check (true);

-- Order Items RLS
create policy "Anyone can insert order items" on public.order_items for insert with check (true);
create policy "Owners view order items" on public.order_items for select using (
  exists (
    select 1 from public.orders o
    join public.restaurants r on r.id = o.restaurant_id
    where o.id = order_items.order_id and r.owner_id = auth.uid()
  )
);

-- Trigger for auto-creating profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name', 'customer')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
