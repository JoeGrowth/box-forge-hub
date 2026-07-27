CREATE TABLE public.portfolio_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  subtitle text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.portfolio_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES public.portfolio_entities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL,
  core_engine_title text,
  core_engine_flow text,
  functional_product text,
  business_engine text[] NOT NULL DEFAULT '{}',
  similar_entities jsonb NOT NULL DEFAULT '[]'::jsonb,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_entities TO authenticated;
GRANT ALL ON public.portfolio_entities TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_products TO authenticated;
GRANT ALL ON public.portfolio_products TO service_role;

ALTER TABLE public.portfolio_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view portfolio entities"
  ON public.portfolio_entities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owners can insert portfolio entities"
  ON public.portfolio_entities FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners can update portfolio entities"
  ON public.portfolio_entities FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners can delete portfolio entities"
  ON public.portfolio_entities FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view portfolio products"
  ON public.portfolio_products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owners can insert portfolio products"
  ON public.portfolio_products FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners can update portfolio products"
  ON public.portfolio_products FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owners can delete portfolio products"
  ON public.portfolio_products FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_portfolio_entities_updated_at BEFORE UPDATE ON public.portfolio_entities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_portfolio_products_updated_at BEFORE UPDATE ON public.portfolio_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();