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
    google_class_id text, -- The 'LoyaltyClass' ID in Google Wallet
    logo_url text,
    hero_image_url text,
    is_active boolean default true, -- Toggle to enable/disable the program
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(restaurant_id)
);

-- LOYALTY CARDS (User progress)
create table if not exists public.loyalty_cards (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users(id) on delete cascade, -- Nullable if we support "shadow" users eventually
    restaurant_id uuid references public.restaurants(id) on delete cascade not null,
    current_points integer default 0,
    total_points_earned integer default 0,
    google_object_id text, -- The specific 'LoyaltyObject' ID for this user's pass
    is_in_wallet boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(user_id, restaurant_id)
);

-- RLS POLICIES
alter table public.loyalty_programs enable row level security;
alter table public.loyalty_cards enable row level security;

-- Programs: Public read (for menu), Owner write
create policy "Public programs are viewable by everyone" on public.loyalty_programs
  for select using (true);

create policy "Owners can insert their own program" on public.loyalty_programs
  for insert with check (auth.uid() in (select owner_id from public.restaurants where id = restaurant_id));

create policy "Owners can update their own program" on public.loyalty_programs
  for update using (auth.uid() in (select owner_id from public.restaurants where id = restaurant_id));

create policy "Owners can delete their own program" on public.loyalty_programs
  for delete using (auth.uid() in (select owner_id from public.restaurants where id = restaurant_id));

-- Cards: Users read/update their own, Owner read/update their customers
create policy "Users can view their own cards" on public.loyalty_cards
  for select using (auth.uid() = user_id);

create policy "Users can update their own cards (e.g. is_in_wallet)" on public.loyalty_cards
  for update using (auth.uid() = user_id);

-- Start Program/Join (Insert)
create policy "Users can join programs" on public.loyalty_cards
  for insert with check (auth.uid() = user_id);
