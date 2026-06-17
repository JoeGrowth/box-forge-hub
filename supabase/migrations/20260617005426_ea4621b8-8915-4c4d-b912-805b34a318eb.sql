
ALTER TYPE graph_event_type ADD VALUE IF NOT EXISTS 'intent_declared';
ALTER TYPE graph_event_type ADD VALUE IF NOT EXISTS 'intent_signal_recorded';
ALTER TYPE graph_event_type ADD VALUE IF NOT EXISTS 'recommendation_outcome_recorded';
ALTER TYPE graph_event_type ADD VALUE IF NOT EXISTS 'experiment_assigned';
ALTER TYPE graph_event_type ADD VALUE IF NOT EXISTS 'experiment_converted';
