
CREATE OR REPLACE FUNCTION public.p_onboarding_completed(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM public.natural_roles nr
       WHERE nr.user_id = _uid
         AND nr.description IS NOT NULL
         AND length(trim(nr.description)) > 0
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles p
       WHERE p.user_id = _uid
         AND p.professional_title  IS NOT NULL AND length(trim(p.professional_title))  > 0
         AND p.bio                 IS NOT NULL AND length(trim(p.bio))                 > 0
         AND p.summary_statement   IS NOT NULL AND length(trim(p.summary_statement))   > 0
         AND p.primary_skills      IS NOT NULL AND length(trim(p.primary_skills::text)) > 0
         AND p.key_projects        IS NOT NULL AND length(trim(p.key_projects::text))   > 0
         AND p.education_certifications IS NOT NULL AND length(trim(p.education_certifications::text)) > 0
         AND p.years_of_experience IS NOT NULL
    )
$$;
