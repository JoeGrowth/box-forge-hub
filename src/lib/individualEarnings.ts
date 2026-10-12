export type EarningRole = "associe" | "internal" | "external";
export interface EarningsEntity {
  id: string; name: string; organization_id: string | null;
  split_config: { recognitionPct?: number; partners?: { id: string; name: string; pct: number }[] } | null;
}
export interface EarningsMission {
  id: string; entity_id: string; client: string | null; type: string | null;
  budget: number | null; currency: string | null; created_at: string;
  internal: EarningsPayee[] | null; external: EarningsPayee[] | null;
}
export interface EarningsPayee { id: string; name: string; role?: string; amount: number; paid?: boolean; user_id?: string }
export interface EarningsSlot { entity_id: string; label: string | null; role_slug: string; slot: number | null }
export interface IndividualEarning {
  sourceKey: string; entityId: string; title: string; role: EarningRole; roleLabel: string;
  currency: string; amount: number; missionId?: string;
}
export const normalizeEarningsName = (s?: string | null) => (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
const roleNames: Record<string, string> = {
  internal_structure: "Structure Handler", internal_process: "Process Handler", internal_broker: "Broker",
  internal_administration: "Administration", internal_quality: "Quality Assurance", internal_quality_assurance: "Quality Assurance",
};
const cleanRoleLabel = (s: string) => normalizeEarningsName(s.replace(/^(internal|entity core team)\s*\d*\s*[–—-]?\s*/i, ""));
export function calculateIndividualEarnings(entities: EarningsEntity[], missions: EarningsMission[], slots: EarningsSlot[], userId: string, fullName: string) {
  const items: IndividualEarning[] = [];
  const profit: Record<string, Record<string, number>> = {};
  const allocation: Record<string, number> = {};
  const me = normalizeEarningsName(fullName);
  for (const entity of entities) {
    const mySlots = slots.filter(s => s.entity_id === entity.id);
    const partners = entity.split_config?.partners ?? [{ id: "p1", name: "Associé 1", pct: 100 }];
    const partnerTotal = partners.reduce((sum, p) => sum + (Number(p.pct) || 0), 0) || 100;
    const rests: Record<string, number> = {};
    for (const mission of missions.filter(m => m.entity_id === entity.id)) {
      const currency = mission.currency || "TND";
      const used = [...(mission.internal ?? []), ...(mission.external ?? [])].reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      rests[currency] = (rests[currency] ?? 0) + Math.max(0, Number(mission.budget ?? 0) - used);
      for (const role of ["internal", "external"] as const) {
        for (const payee of mission[role] ?? []) {
          // Named personal payees take precedence; generic role names require an accepted link.
          const linked = mySlots.find(s => !s.role_slug.startsWith("associe_") && (
            normalizeEarningsName(payee.name) === normalizeEarningsName(s.label) ||
            cleanRoleLabel(payee.name) === cleanRoleLabel(s.label ?? "") ||
            (role === "internal" && cleanRoleLabel(payee.name) === normalizeEarningsName(roleNames[s.role_slug] ?? ""))
          ));
          const isMe = payee.user_id ? payee.user_id === userId : (!!me && normalizeEarningsName(payee.name) === me) || !!linked;
          if (!isMe || Number(payee.amount) <= 0) continue;
          items.push({ sourceKey: `mission:${mission.id}:${role}:${payee.id}`, entityId: entity.id,
            title: mission.client || mission.type || "Mission", role, roleLabel: linked?.label ?? payee.role ?? payee.name,
            currency, amount: Number(payee.amount), missionId: mission.id });
        }
      }
    }
    profit[entity.id] = rests;
    const assocSlots = mySlots.filter(s => s.role_slug.startsWith("associe_"));
    for (const slot of assocSlots) {
      // The role number is authoritative; do not confuse Internal slot positions with partner indices.
      const number = Number(slot.role_slug.replace("associe_", ""));
      const partner = partners[number - 1] ?? partners.find(p => normalizeEarningsName(p.name) === normalizeEarningsName(slot.label));
      if (!partner) continue;
      const share = (Number(partner.pct) || 0) / partnerTotal;
      allocation[entity.id] = (allocation[entity.id] ?? 0) + share * 100;
      const recognition = Math.min(45, Math.max(0, Number(entity.split_config?.recognitionPct ?? 30)));
      for (const [currency, rest] of Object.entries(rests)) {
        const amount = rest >= 1000 ? Math.round((rest * recognition / 100 * share + Number.EPSILON) * 100) / 100 : 0;
        if (amount <= 0) continue;
        items.push({ sourceKey: `associate:${entity.id}:${slot.role_slug}:${currency}`, entityId: entity.id,
          title: "Statement of the organization · Recognition", role: "associe", roleLabel: slot.label ?? partner.name,
          currency, amount });
      }
    }
  }
  return { items, profit, allocation };
}