
-- ================================================================
-- ORGANIZATION GRAPH — Phase 1 (core) + Phase 2 (opportunity linking)
-- New axis: organizations as first-class actors that own opportunities.
-- Does NOT modify the lifecycle projection or event spine.
-- ================================================================

-- 1) Role enum
DO $$ BEGIN
  CREATE TYPE public.app_org_role AS ENUM ('viewer','editor','admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'company',  -- company | ministry | ngo | startup | other
  description text,
  logo_url text,
  website text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Membership table
CREATE TABLE IF NOT EXISTS public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.app_org_role NOT NULL DEFAULT 'viewer',
  invited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;
GRANT ALL ON public.organization_members TO service_role;

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org  ON public.organization_members(organization_id);

-- 4) Permission helpers — SECURITY DEFINER to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.is_org_member(_user uuid, _org uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user AND organization_id = _org
  )
$$;

-- Returns true if user has at least the requested role (admin > editor > viewer)
CREATE OR REPLACE FUNCTION public.has_org_role(_user uuid, _org uuid, _min_role public.app_org_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.user_id = _user
      AND m.organization_id = _org
      AND CASE m.role
            WHEN 'admin'  THEN 3
            WHEN 'editor' THEN 2
            WHEN 'viewer' THEN 1
          END
          >=
          CASE _min_role
            WHEN 'admin'  THEN 3
            WHEN 'editor' THEN 2
            WHEN 'viewer' THEN 1
          END
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_org_role(uuid, uuid, public.app_org_role) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.has_org_role(uuid, uuid, public.app_org_role) TO authenticated;

-- 5) Auto-seed creator as admin member
CREATE OR REPLACE FUNCTION public.seed_org_creator_admin()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.organization_members (organization_id, user_id, role, invited_by)
  VALUES (NEW.id, NEW.created_by, 'admin', NEW.created_by)
  ON CONFLICT (organization_id, user_id) DO UPDATE SET role = 'admin';
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS organizations_seed_admin ON public.organizations;
CREATE TRIGGER organizations_seed_admin
AFTER INSERT ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.seed_org_creator_admin();

-- 6) RLS policies — organizations
CREATE POLICY "orgs_select_all_authenticated"
  ON public.organizations FOR SELECT TO authenticated USING (true);

CREATE POLICY "orgs_insert_creator"
  ON public.organizations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "orgs_update_admin"
  ON public.organizations FOR UPDATE TO authenticated
  USING (public.has_org_role(auth.uid(), id, 'admin'))
  WITH CHECK (public.has_org_role(auth.uid(), id, 'admin'));

CREATE POLICY "orgs_delete_admin"
  ON public.organizations FOR DELETE TO authenticated
  USING (public.has_org_role(auth.uid(), id, 'admin'));

-- 7) RLS policies — organization_members
-- Any authenticated user can see members of orgs they belong to
CREATE POLICY "org_members_select_own_orgs"
  ON public.organization_members FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_org_member(auth.uid(), organization_id)
  );

-- Only org admins can add members
CREATE POLICY "org_members_insert_admin"
  ON public.organization_members FOR INSERT TO authenticated
  WITH CHECK (public.has_org_role(auth.uid(), organization_id, 'admin'));

CREATE POLICY "org_members_update_admin"
  ON public.organization_members FOR UPDATE TO authenticated
  USING (public.has_org_role(auth.uid(), organization_id, 'admin'))
  WITH CHECK (public.has_org_role(auth.uid(), organization_id, 'admin'));

CREATE POLICY "org_members_delete_admin_or_self"
  ON public.organization_members FOR DELETE TO authenticated
  USING (
    public.has_org_role(auth.uid(), organization_id, 'admin')
    OR user_id = auth.uid()
  );

-- ================================================================
-- Phase 2: link existing opportunity tables to organizations
-- ================================================================

ALTER TABLE public.job_opportunities
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS visibility_scope text NOT NULL DEFAULT 'global'
    CHECK (visibility_scope IN ('global','organization','private')),
  ADD COLUMN IF NOT EXISTS created_by_user_id uuid;

ALTER TABLE public.tenders
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS visibility_scope text NOT NULL DEFAULT 'global'
    CHECK (visibility_scope IN ('global','organization','private')),
  ADD COLUMN IF NOT EXISTS created_by_user_id uuid;

CREATE INDEX IF NOT EXISTS idx_jobs_org    ON public.job_opportunities(organization_id);
CREATE INDEX IF NOT EXISTS idx_tenders_org ON public.tenders(organization_id);

-- ---------------- Jobs RLS: extend with org editors/admins ----------------
DROP POLICY IF EXISTS "Authenticated users can create jobs" ON public.job_opportunities;
DROP POLICY IF EXISTS "Owners can update their jobs"       ON public.job_opportunities;
DROP POLICY IF EXISTS "Owners can delete their jobs"       ON public.job_opportunities;
DROP POLICY IF EXISTS "Authenticated can view published jobs" ON public.job_opportunities;

CREATE POLICY "jobs_select_published_or_member"
  ON public.job_opportunities FOR SELECT TO authenticated
  USING (
    -- Global published
    (status = 'published' AND visibility_scope = 'global')
    -- Org-scoped published, visible to members
    OR (status = 'published' AND visibility_scope = 'organization'
        AND organization_id IS NOT NULL
        AND public.is_org_member(auth.uid(), organization_id))
    -- Creator always sees own row
    OR user_id = auth.uid()
    -- Org editors/admins always see their org rows regardless of status
    OR (organization_id IS NOT NULL AND public.has_org_role(auth.uid(), organization_id, 'editor'))
  );

CREATE POLICY "jobs_insert_owner_or_org_editor"
  ON public.job_opportunities FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      organization_id IS NULL
      OR public.has_org_role(auth.uid(), organization_id, 'editor')
    )
  );

CREATE POLICY "jobs_update_owner_or_org_editor"
  ON public.job_opportunities FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR (organization_id IS NOT NULL AND public.has_org_role(auth.uid(), organization_id, 'editor'))
  )
  WITH CHECK (
    user_id = auth.uid()
    OR (organization_id IS NOT NULL AND public.has_org_role(auth.uid(), organization_id, 'editor'))
  );

CREATE POLICY "jobs_delete_owner_or_org_admin"
  ON public.job_opportunities FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR (organization_id IS NOT NULL AND public.has_org_role(auth.uid(), organization_id, 'admin'))
  );

-- ---------------- Tenders RLS: extend with org editors/admins ----------------
DROP POLICY IF EXISTS "Authenticated can view published tenders" ON public.tenders;
DROP POLICY IF EXISTS "Procuring users can create tenders"       ON public.tenders;
DROP POLICY IF EXISTS "Owners can update their tenders"          ON public.tenders;
DROP POLICY IF EXISTS "Owners can delete their tenders"          ON public.tenders;

CREATE POLICY "tenders_select_published_or_member"
  ON public.tenders FOR SELECT TO authenticated
  USING (
    (status = 'published' AND visibility_scope = 'global')
    OR (status = 'published' AND visibility_scope = 'organization'
        AND organization_id IS NOT NULL
        AND public.is_org_member(auth.uid(), organization_id))
    OR user_id = auth.uid()
    OR (organization_id IS NOT NULL AND public.has_org_role(auth.uid(), organization_id, 'editor'))
  );

CREATE POLICY "tenders_insert_org_editor_or_procuring"
  ON public.tenders FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      -- Personal tender: must have procuring access
      (organization_id IS NULL AND EXISTS (
         SELECT 1 FROM public.onboarding_state os
         WHERE os.user_id = auth.uid() AND os.procuring_access = true
       ))
      -- Org tender: editor+ in that org
      OR (organization_id IS NOT NULL AND public.has_org_role(auth.uid(), organization_id, 'editor'))
    )
  );

CREATE POLICY "tenders_update_owner_or_org_editor"
  ON public.tenders FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR (organization_id IS NOT NULL AND public.has_org_role(auth.uid(), organization_id, 'editor'))
  )
  WITH CHECK (
    user_id = auth.uid()
    OR (organization_id IS NOT NULL AND public.has_org_role(auth.uid(), organization_id, 'editor'))
  );

CREATE POLICY "tenders_delete_owner_or_org_admin"
  ON public.tenders FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR (organization_id IS NOT NULL AND public.has_org_role(auth.uid(), organization_id, 'admin'))
  );
