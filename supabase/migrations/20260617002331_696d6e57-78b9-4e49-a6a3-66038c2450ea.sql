
-- =========================================================================
-- Phase 4 — Revenue Graph
-- =========================================================================

-- 1) Extend enums --------------------------------------------------------------
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'transaction_created';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'offer_sent';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'offer_accepted';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'contract_created';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'payment_initiated';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'payment_completed';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'payment_failed';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'refund_created';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'delivery_started';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'delivery_completed';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'invoice_created';
ALTER TYPE public.graph_event_type ADD VALUE IF NOT EXISTS 'transaction_completed';

ALTER TYPE public.graph_node_type ADD VALUE IF NOT EXISTS 'organization';
ALTER TYPE public.graph_node_type ADD VALUE IF NOT EXISTS 'contract';
ALTER TYPE public.graph_node_type ADD VALUE IF NOT EXISTS 'transaction';
ALTER TYPE public.graph_node_type ADD VALUE IF NOT EXISTS 'payment';
ALTER TYPE public.graph_node_type ADD VALUE IF NOT EXISTS 'invoice';

ALTER TYPE public.graph_edge_type ADD VALUE IF NOT EXISTS 'USER_CREATED_TRANSACTION';
ALTER TYPE public.graph_edge_type ADD VALUE IF NOT EXISTS 'USER_PAID_USER';
ALTER TYPE public.graph_edge_type ADD VALUE IF NOT EXISTS 'USER_DELIVERED_VALUE';
ALTER TYPE public.graph_edge_type ADD VALUE IF NOT EXISTS 'USER_RECEIVED_VALUE';
ALTER TYPE public.graph_edge_type ADD VALUE IF NOT EXISTS 'TRANSACTION_FOR_OPPORTUNITY';
ALTER TYPE public.graph_edge_type ADD VALUE IF NOT EXISTS 'CONTRACT_BETWEEN_PARTIES';
