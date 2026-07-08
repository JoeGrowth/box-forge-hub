DROP INDEX IF EXISTS public.commitments_idempotency_key_key;
DELETE FROM public.commitments c
USING public.commitments c2
WHERE c.idempotency_key IS NOT NULL
  AND c.idempotency_key = c2.idempotency_key
  AND c.ctid > c2.ctid;
ALTER TABLE public.commitments
  ADD CONSTRAINT commitments_idempotency_key_unique UNIQUE (idempotency_key);