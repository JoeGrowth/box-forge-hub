CREATE TABLE public.distribution_entities (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  org_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.distribution_entities TO authenticated;
GRANT ALL ON public.distribution_entities TO service_role;
ALTER TABLE public.distribution_entities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own distribution entities"
  ON public.distribution_entities FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.distribution_categories (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  entity_id TEXT NOT NULL,
  name TEXT NOT NULL,
  kind TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.distribution_categories TO authenticated;
GRANT ALL ON public.distribution_categories TO service_role;
ALTER TABLE public.distribution_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own distribution categories"
  ON public.distribution_categories FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_distribution_categories_entity ON public.distribution_categories(entity_id);
CREATE INDEX idx_distribution_entities_org ON public.distribution_entities(org_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_distribution_entities_updated_at BEFORE UPDATE ON public.distribution_entities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_distribution_categories_updated_at BEFORE UPDATE ON public.distribution_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();