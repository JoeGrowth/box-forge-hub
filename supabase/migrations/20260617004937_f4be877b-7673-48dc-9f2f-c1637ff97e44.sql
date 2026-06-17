
-- Phase 8 — Autonomous Growth Loops.
-- Turns progression recommendations into platform behavior:
-- notification_engine, engagement_scheduler, recommendation_feedback,
-- conversion_tracking. No new graph. Pure execution layer over the spine.

-- 1) Event catalog extensions.
ALTER TYPE graph_event_type ADD VALUE IF NOT EXISTS 'growth_loop_triggered';
ALTER TYPE graph_event_type ADD VALUE IF NOT EXISTS 'growth_loop_notified';
ALTER TYPE graph_event_type ADD VALUE IF NOT EXISTS 'growth_loop_engaged';
ALTER TYPE graph_event_type ADD VALUE IF NOT EXISTS 'growth_loop_converted';
ALTER TYPE graph_event_type ADD VALUE IF NOT EXISTS 'growth_loop_dismissed';
ALTER TYPE graph_event_type ADD VALUE IF NOT EXISTS 'recommendation_feedback_recorded';
