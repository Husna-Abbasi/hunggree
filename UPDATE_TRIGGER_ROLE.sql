-- Update the handle_new_user function to respect the role from metadata
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
