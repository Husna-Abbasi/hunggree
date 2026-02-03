-- Add restaurant timings to restaurants table
alter table public.restaurants add column if not exists opening_time time default '09:00:00';
alter table public.restaurants add column if not exists closing_time time default '22:00:00';
