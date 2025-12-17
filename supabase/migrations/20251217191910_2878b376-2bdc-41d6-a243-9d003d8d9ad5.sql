-- Store short-lived email confirmation codes for permanent account deletion
CREATE TABLE IF NOT EXISTS public.account_deletion_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token_hash text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  used_at timestamp with time zone
);

-- One active (unused) token per user
CREATE UNIQUE INDEX IF NOT EXISTS account_deletion_tokens_one_active_per_user
  ON public.account_deletion_tokens (user_id)
  WHERE used_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_account_deletion_tokens_expires_at
  ON public.account_deletion_tokens (expires_at);

ALTER TABLE public.account_deletion_tokens ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view their own deletion tokens"
  ON public.account_deletion_tokens
  FOR SELECT
  USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can create their own deletion tokens"
  ON public.account_deletion_tokens
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update their own deletion tokens"
  ON public.account_deletion_tokens
  FOR UPDATE
  USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Optional cleanup by admins only
DO $$ BEGIN
  CREATE POLICY "Only admins can delete deletion tokens"
  ON public.account_deletion_tokens
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;