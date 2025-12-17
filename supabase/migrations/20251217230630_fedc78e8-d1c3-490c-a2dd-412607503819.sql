-- Drop the problematic policy that references itself
DROP POLICY IF EXISTS "Approved co-builders can view other approved onboarding states" ON public.onboarding_state;

-- Create a security definer function to check if user is an approved co-builder
CREATE OR REPLACE FUNCTION public.is_approved_cobuilder(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.onboarding_state
    WHERE user_id = _user_id
      AND journey_status IN ('approved', 'entrepreneur_approved')
  )
$$;

-- Recreate the policy using the security definer function
CREATE POLICY "Approved co-builders can view other approved onboarding states"
ON public.onboarding_state
FOR SELECT
USING (
  -- User must be approved (using security definer to avoid recursion)
  public.is_approved_cobuilder(auth.uid())
  -- Target must also be approved
  AND journey_status IN ('approved', 'entrepreneur_approved')
);