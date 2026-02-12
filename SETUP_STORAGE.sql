
-- Create the storage bucket 'menu_items' if it doesn't exist
insert into storage.buckets (id, name, public)
values ('menu_items', 'menu_items', true)
on conflict (id) do nothing;

-- Set up RLS policies for the 'menu_items' bucket

-- 1. Allow public read access to all files in the bucket
create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'menu_items' );

-- 2. Allow authenticated users to upload files
create policy "Authenticated users can upload"
on storage.objects for insert
with check (
  bucket_id = 'menu_items' 
  and auth.role() = 'authenticated'
);

-- 3. Allow users to update their own files (optional, but good for replacing)
create policy "Users can update own files"
on storage.objects for update
using (
  bucket_id = 'menu_items' 
  and auth.uid() = owner
);

-- 4. Allow users to delete their own files
create policy "Users can delete own files"
on storage.objects for delete
using (
  bucket_id = 'menu_items' 
  and auth.uid() = owner
);
