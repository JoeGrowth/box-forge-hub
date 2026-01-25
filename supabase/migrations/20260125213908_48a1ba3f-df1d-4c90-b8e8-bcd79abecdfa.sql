-- Allow team members to view their own memberships
CREATE POLICY "Team members can view their own memberships"
ON public.startup_team_members
FOR SELECT
USING (auth.uid() = member_user_id);