-- Run this to link ALL existing restaurants (that have no agent) to a specific Agent.
-- REPLACE 'agent_email@example.com' WIT YOUR AGENT EMAIL!

UPDATE public.restaurants
SET onboarded_by = (SELECT id FROM auth.users WHERE email = 'PutYourAgentEmailHere@example.com')
WHERE onboarded_by IS NULL;

-- Verify the update
SELECT id, name, onboarded_by FROM public.restaurants;
