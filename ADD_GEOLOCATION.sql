-- Add latitude and longitude columns to restaurants table
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Optional: Create a spatial index if you plan to do "nearby" queries later (Requires PostGIS extension)
-- CREATE INDEX IF NOT EXISTS restaurants_geo_idx ON public.restaurants USING GIST (ll_to_earth(latitude, longitude));
