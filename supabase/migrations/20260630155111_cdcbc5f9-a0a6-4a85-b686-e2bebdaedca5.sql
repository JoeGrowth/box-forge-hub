INSERT INTO public.event_catalog (event_type, event_version, source_module, description, payload_schema, deprecated)
VALUES ('advisor_eligibility_changed', 1, 'advisor_readiness', 'Advisor eligibility recomputed for user', '{}'::jsonb, false)
ON CONFLICT DO NOTHING;