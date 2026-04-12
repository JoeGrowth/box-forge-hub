
CREATE TABLE public.consulting_services (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  service_title text NOT NULL,
  skill_tag_id uuid REFERENCES public.skill_tags(id),
  price numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  delivery_type text NOT NULL DEFAULT 'remote' CHECK (delivery_type IN ('remote', 'on-site', 'both')),
  availability text,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.consulting_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view active services"
  ON public.consulting_services FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Users can view their own services"
  ON public.consulting_services FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own services"
  ON public.consulting_services FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own services"
  ON public.consulting_services FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own services"
  ON public.consulting_services FOR DELETE
  USING (auth.uid() = user_id);

CREATE TABLE public.service_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id uuid NOT NULL REFERENCES public.consulting_services(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (service_id, requester_id)
);

ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Requesters can insert their own requests"
  ON public.service_requests FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Requesters can view their own requests"
  ON public.service_requests FOR SELECT
  USING (auth.uid() = requester_id);

CREATE POLICY "Service owners can view requests to their services"
  ON public.service_requests FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.consulting_services cs
    WHERE cs.id = service_requests.service_id AND cs.user_id = auth.uid()
  ));

CREATE POLICY "Service owners can update request status"
  ON public.service_requests FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.consulting_services cs
    WHERE cs.id = service_requests.service_id AND cs.user_id = auth.uid()
  ));

CREATE TRIGGER update_consulting_services_updated_at
  BEFORE UPDATE ON public.consulting_services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
