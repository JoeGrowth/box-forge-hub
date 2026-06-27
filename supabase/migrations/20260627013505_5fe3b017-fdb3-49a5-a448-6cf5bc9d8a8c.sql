
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'opportunity.created';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'opportunity.opened';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'opportunity.applied';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'opportunity.matched';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'opportunity.accepted';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'opportunity.closed';
