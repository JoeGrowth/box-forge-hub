ALTER TABLE public.declaration_entities
ADD COLUMN IF NOT EXISTS split_config jsonb NOT NULL DEFAULT '{"recognitionPct":30,"infraPct":40,"partners":[{"id":"p1","name":"Associé 1","pct":100}]}'::jsonb;