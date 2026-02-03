-- Add currency column to consultant_opportunities table
ALTER TABLE public.consultant_opportunities 
ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'TND';