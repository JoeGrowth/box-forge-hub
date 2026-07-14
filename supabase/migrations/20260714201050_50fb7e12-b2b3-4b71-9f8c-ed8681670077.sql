
CREATE TABLE public.domain_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT,
  natural_role TEXT,
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.domain_suggestions TO authenticated;
GRANT ALL ON public.domain_suggestions TO service_role;

ALTER TABLE public.domain_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own domain suggestions"
  ON public.domain_suggestions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own domain suggestions"
  ON public.domain_suggestions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own domain suggestions"
  ON public.domain_suggestions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own domain suggestions"
  ON public.domain_suggestions FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_domain_suggestions_user ON public.domain_suggestions(user_id, created_at DESC);

-- updated_at trigger
CREATE TRIGGER update_domain_suggestions_updated_at
  BEFORE UPDATE ON public.domain_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enforce max 3 saved suggestions per user
CREATE OR REPLACE FUNCTION public.enforce_domain_suggestions_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.domain_suggestions
  WHERE id IN (
    SELECT id FROM public.domain_suggestions
    WHERE user_id = NEW.user_id
    ORDER BY created_at DESC
    OFFSET 3
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_domain_suggestions_limit
  AFTER INSERT ON public.domain_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_domain_suggestions_limit();
