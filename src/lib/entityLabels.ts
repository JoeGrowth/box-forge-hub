// Entity legal-form labels (Box For Health Solutions).
// Rules:
// - Certificate of Incorporation uploaded  -> "Corporated Partnership"
// - No certificate, 1 (or 0) members       -> "Sole Proprietorship"
// - No certificate, 2+ members             -> "Unincorporated Partnership"
import { supabase } from "@/integrations/supabase/client";

export type EntityLabelInput = { hasCertificate: boolean; memberCount: number };

export function getEntityLabel({ hasCertificate, memberCount }: EntityLabelInput): string {
  if (hasCertificate) return "Corporated Partnership";
  return memberCount >= 2 ? "Unincorporated Partnership" : "Sole Proprietorship";
}

export function isCertificateDoc(name: string | null | undefined): boolean {
  return !!name && name.toLowerCase().includes("certificate of incorporation");
}

// Fetch certificate + member-count inputs for organizations the current user can read.
// Members and legal documents are member-scoped by RLS, so this is used on
// authenticated entity surfaces (org list, home entities card, org workspace).
export async function fetchEntityLabelInputs(
  orgIds: string[],
): Promise<Map<string, EntityLabelInput>> {
  const map = new Map<string, EntityLabelInput>();
  if (!orgIds.length) return map;
  orgIds.forEach((id) => map.set(id, { hasCertificate: false, memberCount: 0 }));

  const [docsRes, membersRes] = await Promise.all([
    supabase
      .from("organization_legal_documents")
      .select("organization_id, name")
      .in("organization_id", orgIds),
    supabase
      .from("organization_members")
      .select("organization_id, user_id")
      .in("organization_id", orgIds),
  ]);

  (docsRes.data ?? []).forEach((d: any) => {
    const entry = map.get(d.organization_id);
    if (entry && isCertificateDoc(d.name)) entry.hasCertificate = true;
  });
  const seen = new Set<string>();
  (membersRes.data ?? []).forEach((m: any) => {
    const key = `${m.organization_id}:${m.user_id}`;
    if (seen.has(key)) return;
    seen.add(key);
    const entry = map.get(m.organization_id);
    if (entry) entry.memberCount += 1;
  });

  return map;
}
