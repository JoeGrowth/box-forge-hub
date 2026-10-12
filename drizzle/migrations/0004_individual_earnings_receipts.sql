CREATE TABLE public.earnings_bank_receipts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL DEFAULT auth.uid(),
 entity_id uuid NOT NULL REFERENCES public.declaration_entities(id) ON DELETE CASCADE,
 source_key text NOT NULL,
 earning_role text NOT NULL CHECK (earning_role IN ('associe','internal','external')),
 currency text NOT NULL,
 amount numeric(16,2) NOT NULL CHECK (amount > 0),
 received_at date NOT NULL DEFAULT CURRENT_DATE,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.earnings_bank_receipts TO authenticated;
GRANT ALL ON public.earnings_bank_receipts TO service_role;
ALTER TABLE public.earnings_bank_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own bank receipts" ON public.earnings_bank_receipts FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Record own bank receipts" ON public.earnings_bank_receipts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.declaration_entities d WHERE d.id = entity_id));
CREATE POLICY "Remove own bank receipts" ON public.earnings_bank_receipts FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE INDEX earnings_bank_receipts_user_source_idx ON public.earnings_bank_receipts(user_id, source_key);
COMMENT ON TABLE public.earnings_bank_receipts IS 'Personal confirmations of earnings received, not a bank balance or organization payment ledger.';