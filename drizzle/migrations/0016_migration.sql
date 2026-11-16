alter table public.organization_projects
  add column if not exists client text,
  add column if not exists context text,
  add column if not exists contract_signed boolean not null default false,
  add column if not exists advance_paid_percent numeric check (advance_paid_percent is null or (advance_paid_percent >= 0 and advance_paid_percent <= 100));