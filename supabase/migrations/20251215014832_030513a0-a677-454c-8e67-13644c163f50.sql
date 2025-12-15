-- Drop the existing constraint
ALTER TABLE public.startup_ideas DROP CONSTRAINT startup_ideas_review_status_check;

-- Add updated constraint with all valid status values
ALTER TABLE public.startup_ideas ADD CONSTRAINT startup_ideas_review_status_check 
CHECK (review_status = ANY (ARRAY['pending'::text, 'under_review'::text, 'approved'::text, 'rejected'::text, 'declined'::text, 'needs_enhancement'::text]));

-- Add RLS policy for admins to view all journey responses (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'entrepreneur_journey_responses' 
    AND policyname = 'Admins can view all journey responses'
  ) THEN
    CREATE POLICY "Admins can view all journey responses" 
    ON public.entrepreneur_journey_responses 
    FOR SELECT 
    USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;