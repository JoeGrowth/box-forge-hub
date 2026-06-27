CREATE TABLE public.commitment_checkpoints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  commitment_id UUID NOT NULL REFERENCES public.commitments(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_offset INT NOT NULL CHECK (day_offset > 0),
  label TEXT NOT NULL,
  note TEXT,
  evidence_id UUID REFERENCES public.evidence(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (commitment_id, day_offset)
);
GRANT SELECT, INSERT ON public.commitment_checkpoints TO authenticated;
GRANT ALL ON public.commitment_checkpoints TO service_role;
ALTER TABLE public.commitment_checkpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their checkpoints" ON public.commitment_checkpoints
FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Relationship partners view checkpoints" ON public.commitment_checkpoints
FOR SELECT TO authenticated USING (EXISTS (
  SELECT 1 FROM public.commitments c
  LEFT JOIN public.advisor_relationships r ON r.id = c.relationship_id
  WHERE c.id = commitment_checkpoints.commitment_id
    AND (c.owner_id = auth.uid() OR r.advisor_id = auth.uid() OR r.user_id = auth.uid())
));
CREATE INDEX idx_checkpoints_commitment ON public.commitment_checkpoints(commitment_id);

CREATE OR REPLACE FUNCTION public.tg_emit_checkpoint_event()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.graph_events (event_type, user_id, aggregate_type, aggregate_id, source_module, payload, idempotency_key)
  VALUES ('commitment.checkpoint.completed'::public.graph_event_type, NEW.owner_id, 'commitment', NEW.commitment_id::text, 'commitments',
    jsonb_build_object('checkpoint_id', NEW.id, 'day_offset', NEW.day_offset, 'label', NEW.label),
    'commitment.checkpoint.completed:' || NEW.id::text)
  ON CONFLICT (idempotency_key) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_emit_checkpoint_event AFTER INSERT ON public.commitment_checkpoints
FOR EACH ROW EXECUTE FUNCTION public.tg_emit_checkpoint_event();

INSERT INTO public.event_catalog (event_type, event_version, source_module, description) VALUES
  ('commitment.checkpoint.completed',1,'commitments','An intermediate checkpoint was completed on a commitment.')
ON CONFLICT (event_type, event_version) DO NOTHING;

CREATE OR REPLACE VIEW public.v_core_loop_metrics
WITH (security_invoker = on) AS
WITH activated AS (
  SELECT user_id, MIN(occurred_at) AS activated_at
  FROM public.graph_events
  WHERE event_type::text IN ('activation.hub_viewed','onboarding.completed')
  GROUP BY user_id
),
first_commitment AS (
  SELECT owner_id AS user_id, MIN(created_at) AS first_commitment_at
  FROM public.commitments GROUP BY owner_id
),
first_completion AS (
  SELECT owner_id AS user_id, MIN(completed_at) AS first_completion_at
  FROM public.commitments WHERE status = 'completed' GROUP BY owner_id
),
first_contribution AS (
  SELECT actor_id AS user_id, MIN(created_at) AS first_contribution_at
  FROM public.contributions GROUP BY actor_id
),
first_milestone AS (
  SELECT achieved_by AS user_id, MIN(achieved_at) AS first_milestone_at
  FROM public.milestones WHERE achieved_by IS NOT NULL GROUP BY achieved_by
)
SELECT
  a.user_id,
  a.activated_at,
  fc.first_commitment_at,
  fcomp.first_completion_at,
  fcon.first_contribution_at,
  fm.first_milestone_at,
  (fcon.first_contribution_at IS NOT NULL
    AND fcon.first_contribution_at <= a.activated_at + interval '30 days') AS verified_contributor_30d
FROM activated a
LEFT JOIN first_commitment fc ON fc.user_id = a.user_id
LEFT JOIN first_completion fcomp ON fcomp.user_id = a.user_id
LEFT JOIN first_contribution fcon ON fcon.user_id = a.user_id
LEFT JOIN first_milestone fm ON fm.user_id = a.user_id;
GRANT SELECT ON public.v_core_loop_metrics TO authenticated, service_role;