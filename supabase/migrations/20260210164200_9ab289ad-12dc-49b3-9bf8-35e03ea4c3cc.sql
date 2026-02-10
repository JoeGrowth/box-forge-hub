-- Add compensation proposal fields to startup_applications
ALTER TABLE public.startup_applications
ADD COLUMN proposed_monthly_salary numeric DEFAULT NULL,
ADD COLUMN proposed_salary_currency text DEFAULT 'USD',
ADD COLUMN proposed_time_equity_percentage numeric DEFAULT 0,
ADD COLUMN proposed_cliff_years integer DEFAULT 1,
ADD COLUMN proposed_vesting_years integer DEFAULT 4,
ADD COLUMN proposed_performance_equity_percentage numeric DEFAULT 0,
ADD COLUMN proposed_performance_milestone text DEFAULT NULL,
ADD COLUMN proposed_include_salary boolean DEFAULT false;