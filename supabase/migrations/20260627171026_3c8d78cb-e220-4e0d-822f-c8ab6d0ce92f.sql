
CREATE TABLE public.goal_change_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  old_goal TEXT,
  new_goal TEXT NOT NULL,
  source TEXT DEFAULT 'profile',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.goal_change_log TO authenticated;
GRANT ALL ON public.goal_change_log TO service_role;
ALTER TABLE public.goal_change_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users insert own goal changes" ON public.goal_change_log
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users read own goal changes" ON public.goal_change_log
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all goal changes" ON public.goal_change_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_goal_change_log_user ON public.goal_change_log(user_id, created_at DESC);
