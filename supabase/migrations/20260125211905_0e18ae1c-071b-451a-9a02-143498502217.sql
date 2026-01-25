-- Allow co-builders (applicants) to view idea journey progress for startups they applied to
CREATE POLICY "Applicants can view startup idea journey progress"
ON public.idea_journey_progress
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.startup_applications
    WHERE startup_applications.startup_id = idea_journey_progress.startup_id
    AND startup_applications.applicant_id = auth.uid()
  )
);

-- Allow team members to view idea journey progress for their startup
CREATE POLICY "Team members can view startup idea journey progress"
ON public.idea_journey_progress
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.startup_team_members
    WHERE startup_team_members.startup_id = idea_journey_progress.startup_id
    AND startup_team_members.member_user_id = auth.uid()
  )
);

-- Enable realtime for idea_journey_progress so co-builders see updates in real-time
ALTER PUBLICATION supabase_realtime ADD TABLE public.idea_journey_progress;