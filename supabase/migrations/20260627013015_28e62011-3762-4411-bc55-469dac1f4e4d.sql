-- 1. Idempotency on commitments
ALTER TABLE public.commitments ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_commitments_idempotency_key
  ON public.commitments(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- 2. Advisor acceptance hook
CREATE OR REPLACE FUNCTION public.tg_commit_on_request_accepted()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_rel_id UUID;
BEGIN
  IF NEW.status <> 'accepted' OR OLD.status = 'accepted' THEN RETURN NEW; END IF;
  IF NEW.request_type NOT IN ('mentorship','solution_signoff') THEN RETURN NEW; END IF;

  SELECT id INTO v_rel_id FROM public.advisor_relationships
   WHERE origin_request_id = NEW.id LIMIT 1;

  INSERT INTO public.commitments (
    owner_id, relationship_id, box_id, title, description,
    duration_days, created_from, idempotency_key, metadata
  ) VALUES (
    NEW.requester_id, v_rel_id, NEW.box_id,
    'Complete your first advisor milestone',
    'Auto-created from advisor acceptance. Define a measurable outcome to ship in 14 days.',
    14, 'advisor',
    'advisor:' || COALESCE(v_rel_id::text, NEW.id::text) || ':first_commitment',
    jsonb_build_object('request_id', NEW.id, 'request_type', NEW.request_type)
  )
  ON CONFLICT (idempotency_key) DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_commit_on_request_accepted ON public.box_inbound_requests;
CREATE TRIGGER trg_commit_on_request_accepted
AFTER UPDATE OF status ON public.box_inbound_requests
FOR EACH ROW EXECUTE FUNCTION public.tg_commit_on_request_accepted();

-- 3. Solution validation hook
CREATE OR REPLACE FUNCTION public.tg_commit_on_idea_validated()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.validated_at IS NULL OR OLD.validated_at IS NOT NULL THEN RETURN NEW; END IF;

  INSERT INTO public.commitments (
    owner_id, box_id, title, description,
    duration_days, created_from, idempotency_key, metadata
  ) VALUES (
    NEW.creator_id, NULL,
    'Validate the next execution milestone',
    'Pick one: customer interviews, prototype test, partner conversation, or market evidence. Validation without execution is where ideas decay.',
    14, 'milestone',
    'idea:' || NEW.id::text || ':post_validation',
    jsonb_build_object('idea_id', NEW.id, 'idea_title', NEW.title)
  )
  ON CONFLICT (idempotency_key) DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_commit_on_idea_validated ON public.startup_ideas;
CREATE TRIGGER trg_commit_on_idea_validated
AFTER UPDATE OF validated_at ON public.startup_ideas
FOR EACH ROW EXECUTE FUNCTION public.tg_commit_on_idea_validated();

-- 4. Startup joining hook
CREATE OR REPLACE FUNCTION public.tg_commit_on_team_joined()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.member_user_id IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.commitments (
    owner_id, title, description,
    duration_days, created_from, idempotency_key, metadata
  ) VALUES (
    NEW.member_user_id,
    'First contribution',
    'Define and ship your first measurable contribution to this startup within 14 days. Person → startup → contribution → reputation.',
    14, 'negotiation',
    'startup:' || NEW.startup_id::text || ':' || NEW.member_user_id::text || ':first_contribution',
    jsonb_build_object('startup_id', NEW.startup_id, 'team_member_id', NEW.id)
  )
  ON CONFLICT (idempotency_key) DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_commit_on_team_joined ON public.startup_team_members;
CREATE TRIGGER trg_commit_on_team_joined
AFTER INSERT ON public.startup_team_members
FOR EACH ROW EXECUTE FUNCTION public.tg_commit_on_team_joined();