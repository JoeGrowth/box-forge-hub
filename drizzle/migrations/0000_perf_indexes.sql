CREATE INDEX IF NOT EXISTS idx_jpr_user_id ON public.journey_phase_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_decl_missions_entity_paid ON public.declaration_missions(entity_id, client_paid);
CREATE INDEX IF NOT EXISTS idx_click_events_user ON public.click_events(user_id);