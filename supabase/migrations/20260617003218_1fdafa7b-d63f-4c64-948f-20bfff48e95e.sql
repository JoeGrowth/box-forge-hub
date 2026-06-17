
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'equity_offer_created';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'equity_offer_accepted';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'equity_offer_rejected';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'equity_allocation_created';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'vesting_started';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'vesting_milestone_completed';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'equity_transferred';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'equity_revoked';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'ownership_exit_requested';
-- equity_vested already exists from Phase 1.

ALTER TYPE public.graph_node_type ADD VALUE IF NOT EXISTS 'role';
ALTER TYPE public.graph_node_type ADD VALUE IF NOT EXISTS 'equity_allocation';
ALTER TYPE public.graph_node_type ADD VALUE IF NOT EXISTS 'vesting_schedule';
ALTER TYPE public.graph_node_type ADD VALUE IF NOT EXISTS 'contribution';
-- venture already exists.

ALTER TYPE public.graph_edge_type ADD VALUE IF NOT EXISTS 'USER_OWNS_EQUITY';
ALTER TYPE public.graph_edge_type ADD VALUE IF NOT EXISTS 'USER_CONTRIBUTED_TO_VENTURE';
ALTER TYPE public.graph_edge_type ADD VALUE IF NOT EXISTS 'EQUITY_ALLOCATED_FOR_CONTRIBUTION';
ALTER TYPE public.graph_edge_type ADD VALUE IF NOT EXISTS 'USER_HAS_ROLE_IN_VENTURE';
ALTER TYPE public.graph_edge_type ADD VALUE IF NOT EXISTS 'EQUITY_VESTED_FROM_ALLOCATION';
