CREATE TABLE public.beta_bug_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  location TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low','medium','high','critical')),
  sub_task TEXT,
  description TEXT NOT NULL,
  screenshot_url TEXT,
  screenshot_path TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.beta_bug_reports TO authenticated;
GRANT ALL ON public.beta_bug_reports TO service_role;

ALTER TABLE public.beta_bug_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create bug reports" ON public.beta_bug_reports
  FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Users can view their own bug reports" ON public.beta_bug_reports
  FOR SELECT TO authenticated
  USING (reporter_id = auth.uid());

CREATE POLICY "Admins can manage all bug reports" ON public.beta_bug_reports
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_beta_bug_reports_status ON public.beta_bug_reports(status);
CREATE INDEX idx_beta_bug_reports_reporter ON public.beta_bug_reports(reporter_id);
CREATE INDEX idx_beta_bug_reports_created_at ON public.beta_bug_reports(created_at DESC);

CREATE TRIGGER trg_beta_bug_reports_updated_at
  BEFORE UPDATE ON public.beta_bug_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();