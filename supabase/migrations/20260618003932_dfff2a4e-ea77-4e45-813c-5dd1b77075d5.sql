-- Public-read policy for approved profiles, enabling /u/:slug as a referral/SEO surface.
GRANT SELECT ON public.profiles TO anon;

CREATE POLICY "Public can view approved profiles"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (
  ((is_deleted = false) OR (is_deleted IS NULL))
  AND EXISTS (
    SELECT 1 FROM public.onboarding_state os
    WHERE os.user_id = profiles.user_id
      AND os.journey_status = ANY (ARRAY['approved'::text, 'entrepreneur_approved'::text])
  )
);