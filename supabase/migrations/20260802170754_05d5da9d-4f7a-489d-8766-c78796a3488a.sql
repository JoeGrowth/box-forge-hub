alter table public.distribution_records
  add column if not exists client text,
  add column if not exists iteration integer default 1;

grant select, insert, update on public.distribution_records to authenticated;
grant all on public.distribution_records to service_role;
