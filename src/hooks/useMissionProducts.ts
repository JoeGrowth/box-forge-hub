import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type MissionProduct = { id: string; name: string; shippedCount: number };

export async function fetchMissionProducts(orgId: string): Promise<MissionProduct[]> {
  const [products, iterations] = await Promise.all([
    supabase.from("organization_products").select("id, name").eq("organization_id", orgId).is("archived_at", null).order("position"),
    supabase.from("organization_product_iterations").select("product_id").eq("organization_id", orgId).is("archived_at", null),
  ]);
  if (products.error) throw products.error;
  if (iterations.error) throw iterations.error;
  const counts = new Map<string, number>();
  for (const item of iterations.data || []) {
    if (item.product_id) counts.set(item.product_id, (counts.get(item.product_id) || 0) + 1);
  }
  return (products.data || []).map((p) => ({ ...p, shippedCount: counts.get(p.id) || 0 })).filter((p) => p.shippedCount > 0);
}

export function useMissionProducts({ orgId, kind }: { orgId?: string; kind?: string }) {
  const [products, setProducts] = useState<MissionProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [hasOrganization, setHasOrganization] = useState(Boolean(orgId));
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    setProducts([]);
    void (async () => {
      try {
        let resolvedId = orgId;
        if (!resolvedId && kind) {
          const { data, error: folderError } = await supabase.from("distribution_entities").select("org_id").eq("id", kind.split(":")[0]).maybeSingle();
          if (folderError) throw folderError;
          resolvedId = data?.org_id || undefined;
        }
        if (active) setHasOrganization(Boolean(resolvedId));
        const list = resolvedId ? await fetchMissionProducts(resolvedId) : [];
        if (active) setProducts(list);
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [orgId, kind]);
  return { products, loading, error, hasOrganization };
}