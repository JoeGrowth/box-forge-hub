CREATE TABLE IF NOT EXISTS public.box_role_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  box_id uuid not null references public.boxes(id) on delete cascade,
  request_type text not null check (request_type in ('advisor','manager')),
  status text not null default 'pending' check (status in ('pending','approved','declined')),
  note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, box_id, request_type)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.box_role_requests TO authenticated;
GRANT ALL ON public.box_role_requests TO service_role;

ALTER TABLE public.box_role_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own box role requests" ON public.box_role_requests
FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Users create own box role requests" ON public.box_role_requests
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "Users delete own pending box role requests" ON public.box_role_requests
FOR DELETE TO authenticated USING (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "Admins manage box role requests" ON public.box_role_requests
FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER box_role_requests_updated_at BEFORE UPDATE ON public.box_role_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();