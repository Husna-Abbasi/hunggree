-- Table for handling signup requests (Lead Gen style)
CREATE TABLE IF NOT EXISTS public.registration_requests (
    id uuid default gen_random_uuid() primary key,
    restaurant_name text not null,
    whatsapp_number text not null,
    address text not null,
    status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
    created_at timestamptz default now()
);

-- Enable RLS
ALTER TABLE public.registration_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to handle re-runs (Idempotency)
DROP POLICY IF EXISTS "Public can insert registration requests" ON public.registration_requests;
DROP POLICY IF EXISTS "Admins can view registration requests" ON public.registration_requests;
DROP POLICY IF EXISTS "Admins can update registration requests" ON public.registration_requests;

-- Allow ANYONE (including unauthenticated) to submit a request
CREATE POLICY "Public can insert registration requests" 
ON public.registration_requests 
FOR INSERT 
WITH CHECK (true);

-- Only Admins can view/manage requests
CREATE POLICY "Admins can view registration requests" 
ON public.registration_requests 
FOR SELECT 
USING (
    exists (
        select 1 from public.profiles 
        where id = auth.uid() and role = 'admin'
    )
);

CREATE POLICY "Admins can update registration requests" 
ON public.registration_requests 
FOR UPDATE
USING (
    exists (
        select 1 from public.profiles 
        where id = auth.uid() and role = 'admin'
    )
);
