ALTER TABLE public.consultant_opportunities
  ADD COLUMN IF NOT EXISTS report_file_url text,
  ADD COLUMN IF NOT EXISTS report_link text,
  ADD COLUMN IF NOT EXISTS invoice_file_url text,
  ADD COLUMN IF NOT EXISTS invoice_link text,
  ADD COLUMN IF NOT EXISTS report_invoice_sent_at timestamptz;