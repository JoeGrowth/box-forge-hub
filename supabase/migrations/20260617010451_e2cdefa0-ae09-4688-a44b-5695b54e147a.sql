
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'application_submitted';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'application_reviewing';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'application_shortlisted';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'application_accepted';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'application_rejected';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'application_withdrawn';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'application_completed';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'cold_start_seeded';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'cold_start_confirmed';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'notification_dispatched';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'notification_delivered';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'notification_failed';
