
-- Add enhanced fields for richer entrepreneurial achievement capture
-- 5 categories: Projects, Products, Team Experience (NEW), Business, Equity/Value Contributions

ALTER TABLE public.entrepreneurial_onboarding
  -- Projects: role and measurable outcome
  ADD COLUMN IF NOT EXISTS project_role TEXT,
  ADD COLUMN IF NOT EXISTS project_outcome TEXT,
  -- Products: stage and user/customer reach
  ADD COLUMN IF NOT EXISTS product_stage TEXT,
  ADD COLUMN IF NOT EXISTS product_users_count TEXT,
  -- Team Experience (NEW category)
  ADD COLUMN IF NOT EXISTS has_led_team BOOLEAN,
  ADD COLUMN IF NOT EXISTS team_description TEXT,
  ADD COLUMN IF NOT EXISTS team_size INTEGER,
  ADD COLUMN IF NOT EXISTS team_role TEXT,
  ADD COLUMN IF NOT EXISTS team_needs_help BOOLEAN DEFAULT false,
  -- Business: revenue/impact and duration
  ADD COLUMN IF NOT EXISTS business_revenue TEXT,
  ADD COLUMN IF NOT EXISTS business_duration TEXT,
  -- Equity/Value contributions (enhancing board section)
  ADD COLUMN IF NOT EXISTS board_role_type TEXT,
  ADD COLUMN IF NOT EXISTS board_equity_details TEXT;
