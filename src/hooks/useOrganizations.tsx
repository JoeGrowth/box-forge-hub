// Organization hooks — read user's org memberships, single org by slug,
// and per-org members with roles. Backed by the organization_members table
// (RLS lets a user see members of orgs they belong to).

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type OrgRole = "viewer" | "editor" | "admin";

export interface Organization {
  id: string;
  slug: string;
  name: string;
  type: string;
  description: string | null;
  logo_url: string | null;
  website: string | null;
  created_by: string;
  created_at: string;
  lifecycle_stage?: "venture" | "business" | "startup" | "mature";
}


export interface OrgMembership {
  organization: Organization;
  role: OrgRole;
}

export interface OrgMember {
  id: string;
  user_id: string;
  role: OrgRole;
  created_at: string;
  profile?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

const ROLE_RANK: Record<OrgRole, number> = { viewer: 1, editor: 2, admin: 3 };
export const roleAtLeast = (have: OrgRole | null | undefined, need: OrgRole) =>
  !!have && ROLE_RANK[have] >= ROLE_RANK[need];

export function useMyOrganizations(userId: string | undefined) {
  const [memberships, setMemberships] = useState<OrgMembership[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) {
      setMemberships([]);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("organization_members")
      .select("role, organization:organizations(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setMemberships(
      ((data as any[]) ?? [])
        .filter((r) => r.organization)
        .map((r) => ({ organization: r.organization as Organization, role: r.role as OrgRole })),
    );
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);
  return { memberships, loading, reload: load };
}

export function useOrganizationBySlug(slug: string | undefined) {
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!slug) { setOrg(null); setLoading(false); return; }
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("organizations")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (cancelled) return;
      setOrg((data as Organization) ?? null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  return { org, loading };
}

export function useMyOrgRole(userId: string | undefined, orgId: string | undefined) {
  const [role, setRole] = useState<OrgRole | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!userId || !orgId) { setRole(null); return; }
    (async () => {
      const { data } = await supabase
        .from("organization_members")
        .select("role")
        .eq("user_id", userId)
        .eq("organization_id", orgId)
        .maybeSingle();
      if (!cancelled) setRole(((data as any)?.role as OrgRole) ?? null);
    })();
    return () => { cancelled = true; };
  }, [userId, orgId]);
  return role;
}

export function useOrgMembers(orgId: string | undefined) {
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!orgId) { setMembers([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from("organization_members")
      .select("id, user_id, role, created_at")
      .eq("organization_id", orgId)
      .order("role", { ascending: true });
    const rows = ((data as any[]) ?? []) as OrgMember[];
    // Hydrate profiles separately (profiles.user_id is the FK key)
    const ids = rows.map((r) => r.user_id);
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, avatar_url")
        .in("user_id", ids);
      const byId = new Map<string, any>();
      (profs ?? []).forEach((p: any) => byId.set(p.user_id, p));
      rows.forEach((r) => { r.profile = byId.get(r.user_id) ?? null; });
    }
    setMembers(rows);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { load(); }, [load]);
  return { members, loading, reload: load };
}
