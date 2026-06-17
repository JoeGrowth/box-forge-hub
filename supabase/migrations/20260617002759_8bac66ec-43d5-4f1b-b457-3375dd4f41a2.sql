
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'expertise_score_updated';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'trust_score_updated';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'opportunity_completed';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'review_received';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'startup_milestone_completed';

ALTER TYPE public.graph_node_type ADD VALUE IF NOT EXISTS 'achievement';

ALTER TYPE public.graph_edge_type ADD VALUE IF NOT EXISTS 'USER_EARNED_ACHIEVEMENT';
ALTER TYPE public.graph_edge_type ADD VALUE IF NOT EXISTS 'USER_COMPLETED_OPPORTUNITY';
ALTER TYPE public.graph_edge_type ADD VALUE IF NOT EXISTS 'USER_CREATED_VALUE';
ALTER TYPE public.graph_edge_type ADD VALUE IF NOT EXISTS 'USER_RECEIVED_VALIDATION';
ALTER TYPE public.graph_edge_type ADD VALUE IF NOT EXISTS 'USER_IMPROVED_EXPERTISE';
