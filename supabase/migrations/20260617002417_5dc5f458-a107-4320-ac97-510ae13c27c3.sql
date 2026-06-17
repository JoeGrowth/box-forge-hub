
-- 2) Event catalog -------------------------------------------------------------
INSERT INTO public.event_catalog (event_type, event_version, source_module, payload_schema, deprecated)
VALUES
  ('transaction_created','1','revenue',
    '{"required":["transaction_id","buyer_id","seller_id","type","amount","currency"]}'::jsonb, false),
  ('offer_sent','1','revenue',
    '{"required":["offer_id","from_user_id","to_user_id","amount"]}'::jsonb, false),
  ('offer_accepted','1','revenue',
    '{"required":["offer_id","accepted_by"]}'::jsonb, false),
  ('contract_created','1','revenue',
    '{"required":["contract_id","transaction_id","parties"]}'::jsonb, false),
  ('payment_initiated','1','revenue',
    '{"required":["payment_id","transaction_id","amount"]}'::jsonb, false),
  ('payment_completed','1','revenue',
    '{"required":["payment_id","transaction_id","amount"]}'::jsonb, false),
  ('payment_failed','1','revenue',
    '{"required":["payment_id","transaction_id","reason"]}'::jsonb, false),
  ('refund_created','1','revenue',
    '{"required":["refund_id","transaction_id","amount"]}'::jsonb, false),
  ('delivery_started','1','revenue',
    '{"required":["transaction_id"]}'::jsonb, false),
  ('delivery_completed','1','revenue',
    '{"required":["transaction_id"]}'::jsonb, false),
  ('invoice_created','1','revenue',
    '{"required":["invoice_id","transaction_id","amount"]}'::jsonb, false),
  ('transaction_completed','1','revenue',
    '{"required":["transaction_id","buyer_id","seller_id","amount"]}'::jsonb, false)
ON CONFLICT (event_type, event_version) DO NOTHING;

-- 3) Transactions --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  opportunity_id text,
  opportunity_kind text,
  type text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  status text NOT NULL DEFAULT 'pending',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tx_select_party" ON public.transactions FOR SELECT TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "tx_insert_party" ON public.transactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "tx_update_party" ON public.transactions FOR UPDATE TO authenticated
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "tx_admin_all" ON public.transactions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER trg_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_tx_buyer ON public.transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_tx_seller ON public.transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_tx_opportunity ON public.transactions(opportunity_id);

-- 4) Contracts -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE CASCADE,
  parties jsonb NOT NULL DEFAULT '[]'::jsonb,
  terms jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  signed_at timestamptz,
  document_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contracts TO authenticated;
GRANT ALL ON public.contracts TO service_role;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contracts_select_party" ON public.contracts FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.transactions t
    WHERE t.id = contracts.transaction_id
      AND (auth.uid() = t.buyer_id OR auth.uid() = t.seller_id)
  ));
CREATE POLICY "contracts_modify_party" ON public.contracts FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.transactions t
    WHERE t.id = contracts.transaction_id
      AND (auth.uid() = t.buyer_id OR auth.uid() = t.seller_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.transactions t
    WHERE t.id = contracts.transaction_id
      AND (auth.uid() = t.buyer_id OR auth.uid() = t.seller_id)
  ));

CREATE TRIGGER trg_contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Revenue projection --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.revenue_graph (
  user_id uuid PRIMARY KEY,
  total_revenue numeric NOT NULL DEFAULT 0,
  total_spent numeric NOT NULL DEFAULT 0,
  transaction_count int NOT NULL DEFAULT 0,
  completed_value_count int NOT NULL DEFAULT 0,
  buyer_count int NOT NULL DEFAULT 0,
  seller_count int NOT NULL DEFAULT 0,
  revenue_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_event_version bigint NOT NULL DEFAULT 0,
  computed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.revenue_graph TO authenticated;
GRANT ALL ON public.revenue_graph TO service_role;
ALTER TABLE public.revenue_graph ENABLE ROW LEVEL SECURITY;

CREATE POLICY "revenue_select_self" ON public.revenue_graph FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "revenue_admin_all" ON public.revenue_graph FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

-- 6) recompute_revenue ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recompute_revenue(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_rev numeric := 0;
  v_total_spent numeric := 0;
  v_tx_count int := 0;
  v_completed int := 0;
  v_buyers int := 0;
  v_sellers int := 0;
  v_breakdown jsonb := '{}'::jsonb;
  v_max_version bigint;
BEGIN
  SELECT COALESCE(SUM(amount) FILTER (WHERE status='completed'), 0)
    INTO v_total_rev
    FROM public.transactions WHERE seller_id = _user_id;

  SELECT COALESCE(SUM(amount) FILTER (WHERE status='completed'), 0)
    INTO v_total_spent
    FROM public.transactions WHERE buyer_id = _user_id;

  SELECT COUNT(*) INTO v_tx_count
    FROM public.transactions
   WHERE buyer_id = _user_id OR seller_id = _user_id;

  SELECT COUNT(*) INTO v_completed
    FROM public.transactions
   WHERE (buyer_id = _user_id OR seller_id = _user_id) AND status = 'completed';

  SELECT COUNT(DISTINCT buyer_id) INTO v_buyers
    FROM public.transactions WHERE seller_id = _user_id;

  SELECT COUNT(DISTINCT seller_id) INTO v_sellers
    FROM public.transactions WHERE buyer_id = _user_id;

  SELECT COALESCE(jsonb_object_agg(t.type, t.row), '{}'::jsonb)
    INTO v_breakdown
    FROM (
      SELECT type,
             jsonb_build_object(
               'transactions', COUNT(*),
               'completed', COUNT(*) FILTER (WHERE status='completed'),
               'revenue', COALESCE(SUM(amount) FILTER (WHERE status='completed' AND seller_id=_user_id), 0),
               'spent',   COALESCE(SUM(amount) FILTER (WHERE status='completed' AND buyer_id=_user_id), 0)
             ) AS row
        FROM public.transactions
       WHERE buyer_id = _user_id OR seller_id = _user_id
       GROUP BY type
    ) t;

  SELECT COALESCE(MAX(version), 0) INTO v_max_version
    FROM public.graph_events WHERE user_id = _user_id;

  INSERT INTO public.revenue_graph (
    user_id, total_revenue, total_spent, transaction_count, completed_value_count,
    buyer_count, seller_count, revenue_breakdown, source_event_version, computed_at
  ) VALUES (
    _user_id, v_total_rev, v_total_spent, v_tx_count, v_completed,
    v_buyers, v_sellers, v_breakdown, v_max_version, now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    total_spent = EXCLUDED.total_spent,
    transaction_count = EXCLUDED.transaction_count,
    completed_value_count = EXCLUDED.completed_value_count,
    buyer_count = EXCLUDED.buyer_count,
    seller_count = EXCLUDED.seller_count,
    revenue_breakdown = EXCLUDED.revenue_breakdown,
    source_event_version = EXCLUDED.source_event_version,
    computed_at = EXCLUDED.computed_at;
END $$;

-- 7) Backfill ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.backfill_revenue_events_v1()
RETURNS TABLE(source text, attempted bigint, newly_emitted bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_att bigint; v_ins bigint;
BEGIN
  WITH src AS (
    SELECT id, buyer_id, seller_id, type, amount, currency, status, created_at
      FROM public.transactions
  ),
  ins AS (
    INSERT INTO public.graph_events (user_id, event_type, event_version, aggregate_type,
      aggregate_id, source_module, idempotency_key, payload, weight, occurred_at)
    SELECT s.seller_id, 'transaction_created'::graph_event_type, 1, 'transaction',
      s.id::text, 'revenue',
      'transaction_created:v1:'||s.id,
      jsonb_build_object('transaction_id', s.id::text, 'buyer_id', s.buyer_id::text,
        'seller_id', s.seller_id::text, 'type', s.type, 'amount', s.amount, 'currency', s.currency),
      1, COALESCE(s.created_at, now())
    FROM src s
    ON CONFLICT (idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
    RETURNING 1
  )
  SELECT (SELECT COUNT(*) FROM src), (SELECT COUNT(*) FROM ins) INTO v_att, v_ins;
  RETURN QUERY SELECT 'transaction_created'::text, v_att, v_ins;
END $$;
