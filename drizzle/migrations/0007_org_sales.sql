ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS sales_service_based boolean NOT NULL DEFAULT false;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS sales_product_based boolean NOT NULL DEFAULT false;

CREATE TABLE public.org_sales_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'service_proposal' CHECK (kind IN ('service_proposal','product_file')),
  title text NOT NULL DEFAULT '',
  linked_item text NOT NULL DEFAULT '',
  client_name text NOT NULL DEFAULT '',
  doc_date date NOT NULL DEFAULT current_date,
  technical_content text NOT NULL DEFAULT '',
  financial_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  currency text NOT NULL DEFAULT 'TND',
  notes text NOT NULL DEFAULT '',
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_sales_documents TO authenticated;
GRANT ALL ON public.org_sales_documents TO service_role;
ALTER TABLE public.org_sales_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read sales docs" ON public.org_sales_documents FOR SELECT TO authenticated
  USING (public.has_org_role(auth.uid(), organization_id, 'viewer'));
CREATE POLICY "Org admins insert sales docs" ON public.org_sales_documents FOR INSERT TO authenticated
  WITH CHECK (public.has_org_role(auth.uid(), organization_id, 'admin'));
CREATE POLICY "Org admins update sales docs" ON public.org_sales_documents FOR UPDATE TO authenticated
  USING (public.has_org_role(auth.uid(), organization_id, 'admin'))
  WITH CHECK (public.has_org_role(auth.uid(), organization_id, 'admin'));
CREATE POLICY "Org admins delete sales docs" ON public.org_sales_documents FOR DELETE TO authenticated
  USING (public.has_org_role(auth.uid(), organization_id, 'admin'));

CREATE TABLE public.org_sales_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_name text NOT NULL DEFAULT '',
  client_title text NOT NULL DEFAULT '',
  channel text NOT NULL DEFAULT 'wom',
  checks jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'in_negotiation' CHECK (status IN ('in_negotiation','delivered','no_answer')),
  notes text NOT NULL DEFAULT '',
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_sales_opportunities TO authenticated;
GRANT ALL ON public.org_sales_opportunities TO service_role;
ALTER TABLE public.org_sales_opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read sales opps" ON public.org_sales_opportunities FOR SELECT TO authenticated
  USING (public.has_org_role(auth.uid(), organization_id, 'viewer'));
CREATE POLICY "Org admins insert sales opps" ON public.org_sales_opportunities FOR INSERT TO authenticated
  WITH CHECK (public.has_org_role(auth.uid(), organization_id, 'admin'));
CREATE POLICY "Org admins update sales opps" ON public.org_sales_opportunities FOR UPDATE TO authenticated
  USING (public.has_org_role(auth.uid(), organization_id, 'admin'))
  WITH CHECK (public.has_org_role(auth.uid(), organization_id, 'admin'));
CREATE POLICY "Org admins delete sales opps" ON public.org_sales_opportunities FOR DELETE TO authenticated
  USING (public.has_org_role(auth.uid(), organization_id, 'admin'));
CREATE INDEX ON public.org_sales_documents(organization_id);
CREATE INDEX ON public.org_sales_opportunities(organization_id);