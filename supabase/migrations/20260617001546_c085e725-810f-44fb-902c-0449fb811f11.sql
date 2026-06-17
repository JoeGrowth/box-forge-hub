
-- 1. Extend enums
ALTER TYPE graph_event_type ADD VALUE IF NOT EXISTS 'opportunity_created';
ALTER TYPE graph_event_type ADD VALUE IF NOT EXISTS 'opportunity_updated';
ALTER TYPE graph_event_type ADD VALUE IF NOT EXISTS 'opportunity_published';
ALTER TYPE graph_event_type ADD VALUE IF NOT EXISTS 'opportunity_closed';
ALTER TYPE graph_event_type ADD VALUE IF NOT EXISTS 'user_viewed_opportunity';
ALTER TYPE graph_event_type ADD VALUE IF NOT EXISTS 'user_saved_opportunity';
ALTER TYPE graph_event_type ADD VALUE IF NOT EXISTS 'user_applied_opportunity';
ALTER TYPE graph_event_type ADD VALUE IF NOT EXISTS 'user_rejected_opportunity';
ALTER TYPE graph_event_type ADD VALUE IF NOT EXISTS 'user_accepted_opportunity';

ALTER TYPE graph_node_type ADD VALUE IF NOT EXISTS 'opportunity';
ALTER TYPE graph_node_type ADD VALUE IF NOT EXISTS 'category';
ALTER TYPE graph_node_type ADD VALUE IF NOT EXISTS 'domain';
ALTER TYPE graph_node_type ADD VALUE IF NOT EXISTS 'location';

ALTER TYPE graph_edge_type ADD VALUE IF NOT EXISTS 'USER_MATCHES_OPPORTUNITY';
ALTER TYPE graph_edge_type ADD VALUE IF NOT EXISTS 'OPPORTUNITY_REQUIRES_SKILL';
ALTER TYPE graph_edge_type ADD VALUE IF NOT EXISTS 'USER_TRUSTED_FOR_DOMAIN';
ALTER TYPE graph_edge_type ADD VALUE IF NOT EXISTS 'USER_INTERACTED_WITH_OPPORTUNITY';
ALTER TYPE graph_edge_type ADD VALUE IF NOT EXISTS 'OPPORTUNITY_IN_CATEGORY';
ALTER TYPE graph_edge_type ADD VALUE IF NOT EXISTS 'OPPORTUNITY_IN_DOMAIN';
