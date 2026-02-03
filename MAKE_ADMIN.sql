-- Create an admin user function (to be called manually if needed)
-- This requires you to first sign up normally, then run this:
-- select make_admin('your-email@example.com');

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
