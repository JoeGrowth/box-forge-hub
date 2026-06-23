-- AI draft feedback loop event types.
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'draft_generated';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'draft_viewed';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'draft_accepted';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'draft_edited';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'draft_regenerated';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'draft_dismissed';