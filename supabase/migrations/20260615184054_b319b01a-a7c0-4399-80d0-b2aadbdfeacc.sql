ALTER TABLE public.declaration_missions
ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'TND';

ALTER TABLE public.declaration_missions
DROP CONSTRAINT IF EXISTS declaration_missions_currency_check;

ALTER TABLE public.declaration_missions
ADD CONSTRAINT declaration_missions_currency_check
CHECK (currency IN ('TND','EUR','USD'));