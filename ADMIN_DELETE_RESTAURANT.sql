-- Allow admins to delete restaurants
CREATE POLICY "Admins can delete restaurants" ON public.restaurants
  FOR DELETE
  USING (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'admin'
    )
  );
