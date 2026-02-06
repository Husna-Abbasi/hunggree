-- Add pass_fields column to loyalty_programs for customizable pass display
ALTER TABLE public.loyalty_programs 
ADD COLUMN IF NOT EXISTS pass_fields jsonb DEFAULT '{"name": true, "phone": true, "points": true}';

-- Update existing rows to have default fields
UPDATE public.loyalty_programs 
SET pass_fields = '{"name": true, "phone": true, "points": true}' 
WHERE pass_fields IS NULL;
