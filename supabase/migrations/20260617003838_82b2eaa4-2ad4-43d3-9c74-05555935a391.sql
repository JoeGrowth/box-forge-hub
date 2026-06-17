-- 1) Extend event_catalog with progression events
DO $$
BEGIN
  PERFORM 1 FROM pg_type t WHERE t.typname='graph_event_type';
END $$;

ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'stage_transition_evaluated';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'recommendation_generated';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'action_completed';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'milestone_reached';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'goal_created';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'goal_completed';