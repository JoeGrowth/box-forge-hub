
CREATE TABLE public.tracker_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_name TEXT NOT NULL,
  lifecycle_stages TEXT[] DEFAULT '{}',
  team_roles TEXT[] DEFAULT '{}',
  partners TEXT[] DEFAULT '{}',
  objectives TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tracker_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own select tp" ON public.tracker_projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert tp" ON public.tracker_projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update tp" ON public.tracker_projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own delete tp" ON public.tracker_projects FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER tp_updated BEFORE UPDATE ON public.tracker_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.tracker_missions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_code TEXT NOT NULL,
  mission_name TEXT NOT NULL,
  consultants TEXT,
  tjm TEXT,
  status TEXT DEFAULT 'À faire',
  pipeline TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tracker_missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own select tm" ON public.tracker_missions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert tm" ON public.tracker_missions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own update tm" ON public.tracker_missions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own delete tm" ON public.tracker_missions FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER tm_updated BEFORE UPDATE ON public.tracker_missions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
