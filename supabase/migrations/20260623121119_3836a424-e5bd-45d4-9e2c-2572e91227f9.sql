ALTER TABLE public.graph_events
  ADD CONSTRAINT graph_events_idempotency_key_unique UNIQUE (idempotency_key);