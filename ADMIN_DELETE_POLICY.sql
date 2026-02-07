-- Allow admins to delete restaurants by policy
create policy "Admins can delete restaurants"
  on public.restaurants
  for delete
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );
