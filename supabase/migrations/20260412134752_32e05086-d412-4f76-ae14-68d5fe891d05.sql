
CREATE TABLE public.opportunity_interactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  opportunity_id text NOT NULL,
  action_type text NOT NULL CHECK (action_type IN ('apply', 'join', 'request_contact')),
  message text,
  status text NOT NULL DEFAULT 'submitted',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, opportunity_id)
);

ALTER TABLE public.opportunity_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own interactions"
  ON public.opportunity_interactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own interactions"
  ON public.opportunity_interactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all interactions"
  ON public.opportunity_interactions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));
