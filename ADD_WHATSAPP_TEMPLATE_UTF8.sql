ALTER TABLE public.restaurants ADD COLUMN IF NOT EXISTS whatsapp_template text DEFAULT 'Hello, I would like to order:\n\n{items}\n\nTotal: {total}\n\nThank you!';
