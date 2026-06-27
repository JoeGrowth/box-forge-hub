
-- Sprint 1: Solution-first spine

-- 1. Add solution_stage + extension fields to startup_ideas
ALTER TABLE public.startup_ideas
  ADD COLUMN IF NOT EXISTS solution_stage TEXT NOT NULL DEFAULT 'draft'
    CHECK (solution_stage IN ('draft','discovery','validated')),
  ADD COLUMN IF NOT EXISTS solution_extended_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ladder_solution_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ladder_product_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ladder_business_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ladder_company_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ladder_structure_at TIMESTAMPTZ;

-- 2. Solution Canvas table (1:1 with idea)
CREATE TABLE IF NOT EXISTS public.idea_solution_canvas (
  idea_id UUID PRIMARY KEY REFERENCES public.startup_ideas(id) ON DELETE CASCADE,
  problem_statement TEXT,
  who_suffers TEXT,
  evidence TEXT,
  current_alternatives TEXT,
  why_now TEXT,
  completed_at TIMESTAMPTZ,
  signed_off_by UUID REFERENCES auth.users(id),
  signed_off_at TIMESTAMPTZ,
  signed_off_role TEXT CHECK (signed_off_role IN ('advisor','admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.idea_solution_canvas TO authenticated;
GRANT SELECT ON public.idea_solution_canvas TO anon;
GRANT ALL ON public.idea_solution_canvas TO service_role;

ALTER TABLE public.idea_solution_canvas ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read (transparency, drives matching)
CREATE POLICY "Canvas readable by authenticated"
  ON public.idea_solution_canvas FOR SELECT
  TO authenticated
  USING (true);

-- Creator can insert/update their own canvas
CREATE POLICY "Creator manages own canvas"
  ON public.idea_solution_canvas FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.startup_ideas i WHERE i.id = idea_id AND i.creator_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.startup_ideas i WHERE i.id = idea_id AND i.creator_id = auth.uid()));

-- Admins can sign off (update only sign-off fields enforced by trigger)
CREATE POLICY "Admins can sign off canvas"
  ON public.idea_solution_canvas FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.tg_canvas_touch_updated()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  -- Auto-set completed_at when all 5 fields present
  IF NEW.problem_statement IS NOT NULL AND length(trim(NEW.problem_statement)) > 0
     AND NEW.who_suffers IS NOT NULL AND length(trim(NEW.who_suffers)) > 0
     AND NEW.evidence IS NOT NULL AND length(trim(NEW.evidence)) > 0
     AND NEW.current_alternatives IS NOT NULL AND length(trim(NEW.current_alternatives)) > 0
     AND NEW.why_now IS NOT NULL AND length(trim(NEW.why_now)) > 0
  THEN
    IF NEW.completed_at IS NULL THEN NEW.completed_at := now(); END IF;
  ELSE
    NEW.completed_at := NULL;
    NEW.signed_off_at := NULL;
    NEW.signed_off_by := NULL;
    NEW.signed_off_role := NULL;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_canvas_touch ON public.idea_solution_canvas;
CREATE TRIGGER trg_canvas_touch
  BEFORE INSERT OR UPDATE ON public.idea_solution_canvas
  FOR EACH ROW EXECUTE FUNCTION public.tg_canvas_touch_updated();

-- 3. Sync solution_stage on startup_ideas from canvas state
CREATE OR REPLACE FUNCTION public.tg_sync_solution_stage()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  new_stage TEXT := 'draft';
BEGIN
  IF NEW.signed_off_at IS NOT NULL THEN
    new_stage := 'validated';
  ELSIF NEW.completed_at IS NOT NULL THEN
    new_stage := 'discovery';
  ELSE
    new_stage := 'draft';
  END IF;

  UPDATE public.startup_ideas
    SET solution_stage = new_stage,
        ladder_solution_at = CASE WHEN new_stage = 'validated' AND ladder_solution_at IS NULL THEN now() ELSE ladder_solution_at END
    WHERE id = NEW.idea_id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_solution_stage ON public.idea_solution_canvas;
CREATE TRIGGER trg_sync_solution_stage
  AFTER INSERT OR UPDATE ON public.idea_solution_canvas
  FOR EACH ROW EXECUTE FUNCTION public.tg_sync_solution_stage();

-- 4. Gate startup_applications by solution_stage (hybrid: draft blocks; discovery allows with ack; validated open)
--    7-day rule: after 7 days since idea creation, discovery without extension is blocked.
CREATE OR REPLACE FUNCTION public.tg_gate_application_by_stage()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_stage TEXT;
  v_created TIMESTAMPTZ;
  v_extended TIMESTAMPTZ;
BEGIN
  SELECT solution_stage, created_at, solution_extended_until
    INTO v_stage, v_created, v_extended
    FROM public.startup_ideas WHERE id = NEW.startup_idea_id;

  IF v_stage IS NULL THEN
    RAISE EXCEPTION 'Startup idea not found';
  END IF;

  IF v_stage = 'draft' THEN
    RAISE EXCEPTION 'This idea is still in draft. Complete the Solution Canvas before accepting applications.';
  END IF;

  IF v_stage = 'discovery'
     AND v_created < now() - INTERVAL '7 days'
     AND (v_extended IS NULL OR v_extended < now())
  THEN
    RAISE EXCEPTION 'This idea must be validated by an advisor or admin before new applications. Ask the creator to request validation.';
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_gate_application ON public.startup_applications;
CREATE TRIGGER trg_gate_application
  BEFORE INSERT ON public.startup_applications
  FOR EACH ROW EXECUTE FUNCTION public.tg_gate_application_by_stage();

-- 5. Backfill: any idea with no canvas → draft; existing approved ideas → mark as validated (grandfathered)
UPDATE public.startup_ideas
  SET solution_stage = 'validated',
      ladder_solution_at = COALESCE(ladder_solution_at, created_at)
  WHERE review_status = 'approved' AND solution_stage = 'draft';
