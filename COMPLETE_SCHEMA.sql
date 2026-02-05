-- ==========================================
-- 1. CORE SCHEMA
-- ==========================================
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
drop policy if exists "Anyone can insert order items" on public.order_items;
drop policy if exists "Owners view order items" on public.order_items;

create policy "Anyone can insert order items" on public.order_items for insert with check (true);
create policy "Owners view order items" on public.order_items for select using (
  exists (
    select 1 from public.orders o
    join public.restaurants r on r.id = o.restaurant_id
    where o.id = order_items.order_id and r.owner_id = auth.uid()
  )
);

-- ==========================================
-- 2. LOYALTY PROGRAM
-- ==========================================

-- Enable UUID extension if not exists
create extension if not exists "uuid-ossp";

-- LOYALTY PROGRAMS
create table if not exists public.loyalty_programs (
    id uuid default uuid_generate_v4() primary key,
    restaurant_id uuid references public.restaurants(id) on delete cascade not null,
    program_name text not null default 'Loyalty Program',
    points_per_visit integer default 1,
    reward_threshold integer default 10,
    reward_description text default 'Free Item',
    google_class_id text,
    logo_url text,
    hero_image_url text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(restaurant_id)
);

-- LOYALTY CARDS (User progress)
create table if not exists public.loyalty_cards (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users(id) on delete cascade,
    restaurant_id uuid references public.restaurants(id) on delete cascade not null,
    current_points integer default 0,
    total_points_earned integer default 0,
    google_object_id text,
    is_in_wallet boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(user_id, restaurant_id)
);

-- RLS POLICIES
alter table public.loyalty_programs enable row level security;
alter table public.loyalty_cards enable row level security;

drop policy if exists "Public programs are viewable by everyone" on public.loyalty_programs;
drop policy if exists "Owners can insert their own program" on public.loyalty_programs;
drop policy if exists "Owners can update their own program" on public.loyalty_programs;
drop policy if exists "Owners can delete their own program" on public.loyalty_programs;

create policy "Public programs are viewable by everyone" on public.loyalty_programs for select using (true);
create policy "Owners can insert their own program" on public.loyalty_programs for insert with check (auth.uid() in (select owner_id from public.restaurants where id = restaurant_id));
create policy "Owners can update their own program" on public.loyalty_programs for update using (auth.uid() in (select owner_id from public.restaurants where id = restaurant_id));
create policy "Owners can delete their own program" on public.loyalty_programs for delete using (auth.uid() in (select owner_id from public.restaurants where id = restaurant_id));

drop policy if exists "Users can view their own cards" on public.loyalty_cards;
drop policy if exists "Users can update their own cards (e.g. is_in_wallet)" on public.loyalty_cards;
drop policy if exists "Users can join programs" on public.loyalty_cards;

create policy "Users can view their own cards" on public.loyalty_cards for select using (auth.uid() = user_id);
create policy "Users can update their own cards (e.g. is_in_wallet)" on public.loyalty_cards for update using (auth.uid() = user_id);
create policy "Users can join programs" on public.loyalty_cards for insert with check (auth.uid() = user_id);


-- ==========================================
-- 3. ONBOARDING & RESTAURANT STATUS
-- ==========================================
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'restaurant_status') THEN
        CREATE TYPE restaurant_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');
    END IF;
END $$;

ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS onboarding_status restaurant_status DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS admin_notes text;

UPDATE public.restaurants SET onboarding_status = 'approved' WHERE onboarding_status IS NULL;
UPDATE public.restaurants SET is_active = false WHERE onboarding_status = 'pending';

DROP POLICY IF EXISTS "Owners can update own restaurant" ON public.restaurants;
CREATE POLICY "Owners can update own restaurant" ON public.restaurants 
FOR UPDATE USING (owner_id = auth.uid())
WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin' 
    OR 
    (onboarding_status = (SELECT onboarding_status FROM public.restaurants WHERE id = restaurants.id))
);

-- ==========================================
-- 4. REGISTRATION REQUESTS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.registration_requests (
    id uuid default gen_random_uuid() primary key,
    restaurant_name text not null,
    whatsapp_number text not null,
    address text not null,
    status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
    created_at timestamptz default now()
);

ALTER TABLE public.registration_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can insert registration requests" ON public.registration_requests;
DROP POLICY IF EXISTS "Admins can view registration requests" ON public.registration_requests;
DROP POLICY IF EXISTS "Admins can update registration requests" ON public.registration_requests;

CREATE POLICY "Public can insert registration requests" ON public.registration_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view registration requests" ON public.registration_requests FOR SELECT USING (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
CREATE POLICY "Admins can update registration requests" ON public.registration_requests FOR UPDATE USING (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- ==========================================
-- 5. ADMIN ACCESS (FIXED RECURSION)
-- ==========================================
-- Helper to avoid infinite RLS recursion
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

drop policy if exists "Admins manage all restaurants" on public.restaurants;
drop policy if exists "Admins manage all categories" on public.categories;
drop policy if exists "Admins manage all items" on public.items;
drop policy if exists "Admins manage all orders" on public.orders;
drop policy if exists "Admins view all profiles" on public.profiles;

CREATE POLICY "Admins manage all restaurants" ON public.restaurants FOR ALL USING (public.is_admin());
CREATE POLICY "Admins manage all categories" ON public.categories FOR ALL USING (public.is_admin());
CREATE POLICY "Admins manage all items" ON public.items FOR ALL USING (public.is_admin());
CREATE POLICY "Admins manage all orders" ON public.orders FOR ALL USING (public.is_admin());
CREATE POLICY "Admins view all profiles" ON public.profiles FOR SELECT USING (public.is_admin());

-- ==========================================
-- 6. TIMINGS, WHATSAPP TEMPLATE & UTILS
-- ==========================================
alter table public.restaurants add column if not exists opening_time time default '09:00:00';
alter table public.restaurants add column if not exists closing_time time default '22:00:00';

-- ADD_WHATSAPP_TEMPLATE (Missing in previous version causing migration fail)
alter table public.restaurants add column if not exists whatsapp_template text default 'Hello! I would like to order:';

create or replace function public.make_admin(target_email text)
returns void
language plpgsql
security definer
as $$
begin
  update public.profiles
  set role = 'admin'
  where email = target_email;
end;
$$;

-- ==========================================
-- 7. ORDER TRACKING (ORDER COUNTS)
-- ==========================================
-- Missed in previous version, causing migration fail for 'order_count'
alter table public.items add column if not exists order_count integer default 0;

create or replace function public.increment_item_order_count()
returns trigger as $$
begin
  update public.items
  set order_count = order_count + new.quantity
  where id = new.item_id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_order_item_created on public.order_items;
create trigger on_order_item_created
  after insert on public.order_items
  for each row execute function public.increment_item_order_count();


-- ==========================================
-- 8. AUTH TRIGGERS
-- ==========================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data ->> 'full_name', 
    coalesce(new.raw_user_meta_data ->> 'role', 'restaurant_owner')
  )
  on conflict (id) do update 
  set 
    full_name = excluded.full_name,
    role = excluded.role;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
