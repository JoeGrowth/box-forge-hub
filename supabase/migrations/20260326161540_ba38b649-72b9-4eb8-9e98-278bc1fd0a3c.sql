CREATE TABLE public.startup_five_elements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  startup_id UUID NOT NULL REFERENCES public.startup_ideas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  problem TEXT NOT NULL DEFAULT '',
  solution TEXT NOT NULL DEFAULT '',
  product TEXT NOT NULL DEFAULT '',
  market TEXT NOT NULL DEFAULT '',
  business_model TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(startup_id)
);

ALTER TABLE public.startup_five_elements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own five elements"
  ON public.startup_five_elements FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own five elements"
  ON public.startup_five_elements FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own five elements"
  ON public.startup_five_elements FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all five elements"
  ON public.startup_five_elements FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));