
CREATE UNIQUE INDEX IF NOT EXISTS distribution_records_user_kind_title_uniq
ON public.distribution_records (user_id, kind, lower(title));
