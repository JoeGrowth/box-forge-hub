import { supabase } from "@/integrations/supabase/client";

// Keywords used to match free-text `sector` / `preferred_sector` values
// (case-insensitive substring match) to a box slug.
export const BOX_SECTOR_KEYWORDS: Record<string, string[]> = {
  health: ["health", "medtech", "wellness", "telemed", "pharma"],
  agriculture: ["agri", "agritech", "agtech", "farm", "food security"],
  education: ["edu", "edtech", "learning", "training"],
  food: ["food", "nutrition", "restaurant", "beverage"],
  realestate: ["real estate", "proptech", "property", "construction"],
  tech: ["tech", "technology", "ai", "ml", "saas", "software"],
  security: ["security", "cyber", "grc", "compliance", "trust"],
  finance: ["fin", "finance", "fintech", "bank", "insur", "payment"],
};

export function matchesBox(value: string | null | undefined, boxSlug: string): boolean {
  if (!value) return false;
  const v = value.toLowerCase();
  const kws = BOX_SECTOR_KEYWORDS[boxSlug] ?? [boxSlug];
  return kws.some((k) => v.includes(k));
}

export interface BoxLiveStats {
  startups: number;
  cobuilders: number;
  featured: { id: string; name: string; desc: string }[];
}

export async function fetchBoxLiveStats(boxSlug: string): Promise<BoxLiveStats> {
  const kws = BOX_SECTOR_KEYWORDS[boxSlug] ?? [boxSlug];
  const orSectors = kws.map((k) => `sector.ilike.%${k}%`).join(",");
  const orPref = kws.map((k) => `preferred_sector.ilike.%${k}%`).join(",");

  const [ideasRes, profilesRes, featuredRes] = await Promise.all([
    (supabase as any)
      .from("startup_ideas")
      .select("id", { count: "exact", head: true })
      .or(orSectors),
    (supabase as any)
      .from("profiles")
      .select("user_id", { count: "exact", head: true })
      .or(orPref),
    (supabase as any)
      .from("startup_ideas")
      .select("id,title,description")
      .or(orSectors)
      .eq("review_status", "approved")
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  return {
    startups: ideasRes.count ?? 0,
    cobuilders: profilesRes.count ?? 0,
    featured: ((featuredRes.data as any[]) ?? []).map((r) => ({
      id: r.id,
      name: r.title,
      desc: (r.description ?? "").slice(0, 80),
    })),
  };
}

/**
 * A user has affinity with a box when:
 *  - their profile's `preferred_sector` matches the box, OR
 *  - they own at least one startup idea whose `sector` matches the box.
 */
export async function userHasBoxAffinity(userId: string, boxSlug: string): Promise<boolean> {
  const kws = BOX_SECTOR_KEYWORDS[boxSlug] ?? [boxSlug];
  const orPref = kws.map((k) => `preferred_sector.ilike.%${k}%`).join(",");
  const orSectors = kws.map((k) => `sector.ilike.%${k}%`).join(",");

  const [profile, ideas] = await Promise.all([
    (supabase as any)
      .from("profiles")
      .select("user_id")
      .eq("user_id", userId)
      .or(orPref)
      .maybeSingle(),
    (supabase as any)
      .from("startup_ideas")
      .select("id")
      .eq("creator_id", userId)
      .or(orSectors)
      .limit(1),
  ]);

  if (profile?.data) return true;
  if ((ideas?.data as any[])?.length) return true;
  return false;
}
