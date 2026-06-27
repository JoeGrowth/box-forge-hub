INSERT INTO public.event_catalog (event_type, event_version, description, source_module, payload_schema, deprecated)
VALUES ('box_request_created', 1, 'A user submitted a box inbound request', 'box.requests',
  '{"properties":{"request_type":{"type":"string"},"topic":{"type":"string"},"box_id":{"type":"string"}},"required":["request_type"]}'::jsonb,
  false)
ON CONFLICT (event_type, event_version) DO UPDATE SET deprecated = false;