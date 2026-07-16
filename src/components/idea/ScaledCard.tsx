import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Sparkles, UserPlus, Search, Loader2, Send, Pencil, Save, X, Check,
  Building2, Users2, Cpu, Database, GraduationCap, Rocket, FileText,
  Package, LinkIcon, Layers, Lock, ArrowRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ScaledCardProps {
  userId: string;
  title: string;
  tagline: string;
  onBrandNameSaved?: (name: string) => void;
}

interface ProfileMatch {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  primary_skills: string | null;
}

type Phase = "branding" | "systematization" | "asset";
type Model = "boutique_firm" | "decentralized_network" | "consulting_platform" | "training_academy";

interface VentureState {
  current_phase: Phase;
  branding_completed_at: string | null;
  systematization_completed_at: string | null;
  asset_reached_at: string | null;
  selected_model: Model | null;
  company_name: string | null;
  company_registration: string | null;
  certificate_of_incorporation_url: string | null;
  proposal_template_url: string | null;
  frameworks_url: string | null;
  software_tools: string | null;
  datasets_methodologies: string | null;
  training_courses: string | null;
  autonomous_operations: boolean;
}

const DEFAULT_STATE: VentureState = {
  current_phase: "branding",
  branding_completed_at: null,
  systematization_completed_at: null,
  asset_reached_at: null,
  selected_model: null,
  company_name: null,
  company_registration: null,
  certificate_of_incorporation_url: null,
  proposal_template_url: null,
  frameworks_url: null,
  software_tools: null,
  datasets_methodologies: null,
  training_courses: null,
  autonomous_operations: false,
};

const PHASE_META: Record<Phase, { label: string; sub: string; icon: any }> = {
  branding: { label: "Structure", sub: "Branding", icon: Sparkles },
  systematization: { label: "Detach", sub: "Systemize", icon: Layers },
  asset: { label: "Asset", sub: "Scale", icon: Rocket },
};


const MODEL_META: Record<Model, { label: string; desc: string; icon: any }> = {
  boutique_firm: { label: "Boutique Firm", desc: "High-touch consulting firm centered on your expertise.", icon: Building2 },
  decentralized_network: { label: "Decentralized Expert Network", desc: "Independent consultants under a shared brand and methodology.", icon: Users2 },
  consulting_platform: { label: "Consulting Platform", desc: "Match clients with vetted consultants using standardized frameworks.", icon: Cpu },
  training_academy: { label: "Training Academy", desc: "Educational organization teaching your methodology.", icon: GraduationCap },
};

export function ScaledCard({ userId, title, tagline, onBrandNameSaved }: ScaledCardProps) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [brandDraft, setBrandDraft] = useState(title);
  const [savingName, setSavingName] = useState(false);
  // Optimistic override: once the user successfully saves a brand name, keep it
  // displayed even if the parent's profile-fetch effect momentarily re-fires
  // and passes back the stale/fallback title before its own state re-syncs.
  const [savedNameOverride, setSavedNameOverride] = useState<string | null>(null);
  const displayTitle = savedNameOverride ?? title;

  const [state, setState] = useState<VentureState>(DEFAULT_STATE);
  const [milestones, setMilestones] = useState<Set<string>>(new Set());
  const [autoCounts, setAutoCounts] = useState({ soloMissions: 0, contractorMissions: 0, coreServices: 0, professionalPresence: false, hasDistribution: false, hasDeclaration: false, orgHasDistribution: false, orgHasDeclaration: false });
  const [orgSlug, setOrgSlug] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => { setBrandDraft(displayTitle); }, [displayTitle]);
  // Clear the override once the parent's title catches up.
  useEffect(() => {
    if (savedNameOverride && title === savedNameOverride) setSavedNameOverride(null);
  }, [title, savedNameOverride]);


  const reloadOrgSignals = async (userId: string, brandName: string) => {
    // Find orgs created by the user; prefer brand-name match, else most recent
    const { data: orgs } = await supabase
      .from("organizations")
      .select("id, slug, name, created_at")
      .eq("created_by", userId)
      .order("created_at", { ascending: false });
    const list = ((orgs as any[]) || []);
    const target = brandName.trim().toLowerCase();
    const match = list.find(o => (o.name || "").trim().toLowerCase() === target) || list[0];
    const oid = match?.id as string | undefined;
    const oslug = match?.slug as string | undefined;

    let orgHasDeclaration = false;
    if (oid) {
      const { data: ents } = await supabase.from("declaration_entities").select("id").eq("organization_id", oid);
      const ids = ((ents as any[]) || []).map(e => e.id);
      if (ids.length) {
        const { data: mData } = await supabase.from("declaration_missions").select("id").in("entity_id", ids).limit(1);
        orgHasDeclaration = ((mData as any[]) || []).length > 0;
      }
    }
    // distribution_records has no org column — scope to the user
    const { data: distData } = await supabase.from("distribution_records").select("id").eq("user_id", userId).limit(1);
    const orgHasDistribution = ((distData as any[]) || []).length > 0;

    return { orgId: oid || null, orgSlug: oslug || null, orgHasDeclaration, orgHasDistribution };
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [stateRes, msRes, missionsRes, servicesRes, profileRes, distRes, entitiesRes] = await Promise.all([
        supabase.from("consulting_venture_state" as any).select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("consulting_venture_milestones" as any).select("milestone_key").eq("user_id", userId),
        supabase.from("consultant_opportunities").select("id,stage").eq("user_id", userId).eq("stage", "closed"),
        supabase.from("consulting_services" as any).select("id").eq("user_id", userId),
        supabase.from("profiles").select("full_name,avatar_url,bio,professional_title").eq("user_id", userId).maybeSingle(),
        supabase.from("distribution_records").select("id").eq("user_id", userId).limit(1),
        supabase.from("declaration_entities").select("id").eq("owner_id", userId),
      ]);
      if (stateRes.data) setState({ ...DEFAULT_STATE, ...(stateRes.data as any) });
      setMilestones(new Set(((msRes.data as any[]) || []).map(m => m.milestone_key)));

      const closedCount = (missionsRes.data || []).length;
      const solo = Math.min(3, closedCount);
      const contractor = Math.max(0, closedCount - solo);
      const services = ((servicesRes.data as any[]) || []).length;
      const p = profileRes.data as any;
      const presence = !!(p?.full_name && p?.avatar_url && (p?.bio || p?.professional_title));
      const hasDistribution = ((distRes.data as any[]) || []).length > 0;

      let hasDeclaration = false;
      const entityIds = ((entitiesRes.data as any[]) || []).map(e => e.id);
      if (entityIds.length) {
        const { data: mData } = await supabase.from("declaration_missions").select("id").in("entity_id", entityIds).limit(1);
        hasDeclaration = ((mData as any[]) || []).length > 0;
      }

      const orgSig = await reloadOrgSignals(userId, title);
      setOrgId(orgSig.orgId);
      setOrgSlug(orgSig.orgSlug);

      setAutoCounts({
        soloMissions: solo, contractorMissions: contractor, coreServices: services, professionalPresence: presence,
        hasDistribution, hasDeclaration,
        orgHasDistribution: orgSig.orgHasDistribution, orgHasDeclaration: orgSig.orgHasDeclaration,
      });
      setLoading(false);
    })();
  }, [userId, title]);



  const upsertState = async (patch: Partial<VentureState>) => {
    const next = { ...state, ...patch };
    setState(next);
    await supabase
      .from("consulting_venture_state" as any)
      .upsert({ user_id: userId, ...next } as any, { onConflict: "user_id" });
  };

  const toggleMilestone = async (key: string, on: boolean) => {
    const next = new Set(milestones);
    if (on) {
      next.add(key);
      await supabase.from("consulting_venture_milestones" as any).upsert({ user_id: userId, milestone_key: key } as any, { onConflict: "user_id,milestone_key" });
    } else {
      next.delete(key);
      await supabase.from("consulting_venture_milestones" as any).delete().eq("user_id", userId).eq("milestone_key", key);
    }
    setMilestones(next);
  };

  const slugify = (s: string) =>
    s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "org";

  const ensureOrgAndOpen = async () => {
    if (orgSlug) { navigate(`/organizations/${orgSlug}`); return; }
    const name = (title || "").trim();
    if (!name) { toast.error("Set a brand name first"); return; }
    let slug = slugify(name);
    let suffix = 0;
    // Find a free slug (up to a few attempts)
    while (suffix < 5) {
      const { data: existing } = await supabase.from("organizations").select("id").eq("slug", slug).maybeSingle();
      if (!existing) break;
      suffix += 1;
      slug = `${slugify(name)}-${Math.random().toString(36).slice(2, 6)}`;
    }
    const { data: created, error } = await supabase
      .from("organizations")
      .insert({ name, slug, created_by: userId })
      .select("id, slug")
      .single();
    if (error || !created) { toast.error(error?.message || "Failed to create organization"); return; }
    await supabase.from("organization_members").insert({ organization_id: (created as any).id, user_id: userId, role: "admin" });
    setOrgId((created as any).id);
    setOrgSlug((created as any).slug);
    toast.success("Organization created");
    navigate(`/organizations/${(created as any).slug}`);
  };


  // Milestone completion resolvers (auto detection OR manual override)
  const done = useMemo(() => ({
    solo_missions: autoCounts.soloMissions >= 3 || milestones.has("solo_missions"),
    contractor_missions: autoCounts.contractorMissions >= 7 || milestones.has("contractor_missions"),
    core_services: autoCounts.coreServices >= 3 || milestones.has("core_services"),
    proposal_template: !!state.proposal_template_url || milestones.has("proposal_template"),
    professional_presence: autoCounts.professionalPresence || milestones.has("professional_presence"),
    invite_cobuilder: milestones.has("invite_cobuilder"),
    manage_org: !!orgId && autoCounts.orgHasDeclaration && autoCounts.orgHasDistribution,
    brand_added: !!orgId || milestones.has("brand_added"),
    form_company: !!state.company_name?.trim() && !!state.certificate_of_incorporation_url?.trim(),
    standardized_processes: milestones.has("standardized_processes"),
    autonomous_operations: state.autonomous_operations,
  }), [autoCounts, milestones, state, orgId]);


  const brandingProgress = useMemo(() => {
    const items = [done.solo_missions, done.contractor_missions, done.proposal_template, done.professional_presence];
    return Math.round((items.filter(Boolean).length / items.length) * 100);
  }, [done]);
  const brandingComplete = brandingProgress === 100;

  const systProgress = useMemo(() => {
    // invite_cobuilder and manage_org are optional and intentionally excluded from phase 2 progress.
    const items = [!!state.selected_model, done.core_services, done.form_company, done.standardized_processes, done.autonomous_operations];
    return Math.round((items.filter(Boolean).length / items.length) * 100);
  }, [state, done]);
  const systComplete = systProgress === 100;



  const advanceToPhase = async (p: Phase) => {
    const stamps: Partial<VentureState> = { current_phase: p };
    if (p === "systematization" && !state.branding_completed_at) stamps.branding_completed_at = new Date().toISOString();
    if (p === "asset") {
      if (!state.systematization_completed_at) stamps.systematization_completed_at = new Date().toISOString();
      if (!state.asset_reached_at) stamps.asset_reached_at = new Date().toISOString();
    }
    await upsertState(stamps);
    toast.success(`Moved to ${PHASE_META[p].label} phase`);
  };


  const saveBrandName = async () => {
    const name = brandDraft.trim();
    if (!name) { toast.error("Brand name required"); return; }
    setSavingName(true);
    const { error } = await supabase.from("profiles").update({ startup_name: name }).eq("user_id", userId);
    setSavingName(false);
    if (error) { toast.error(error.message); return; }
    setSavedNameOverride(name);
    toast.success("Brand name updated");
    setEditingName(false);
    onBrandNameSaved?.(name);
  };


  const jumpPhase = (p: Phase) => {
    // allow navigating between unlocked phases
    const order: Phase[] = ["branding", "systematization", "asset"];
    const currentIdx = order.indexOf(state.current_phase);
    const targetIdx = order.indexOf(p);
    if (targetIdx <= currentIdx) upsertState({ current_phase: p });
  };

  return (
    <div className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card p-4 sm:p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full -mr-20 -mt-20" />

      {/* Header */}
      <div className="relative flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 mb-5 sm:mb-6">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Consulting &amp; Services</p>
          {editingName ? (
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Input
                autoFocus
                value={brandDraft}
                onChange={(e) => setBrandDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveBrandName(); if (e.key === "Escape") { setEditingName(false); setBrandDraft(displayTitle); } }}
                className="h-9 text-base sm:text-lg font-bold flex-1 min-w-0 sm:max-w-xs"
                placeholder="e.g. Pengry"
              />
              <Button size="icon" variant="ghost" className="h-8 w-8 flex-shrink-0" onClick={saveBrandName} disabled={savingName}>
                {savingName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 flex-shrink-0" onClick={() => { setEditingName(false); setBrandDraft(displayTitle); }}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              <h3 className="font-display text-lg sm:text-2xl font-bold text-foreground break-words min-w-0">{displayTitle}</h3>
              <Button size="icon" variant="ghost" className="h-7 w-7 flex-shrink-0" onClick={() => setEditingName(true)} title="Rename brand">
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Badge className="bg-primary/15 text-primary border-primary/30 hover:bg-primary/15">Scaled</Badge>
              <Badge variant="outline" className="text-[10px]">Private · not in ecosystem</Badge>
            </div>
          )}

          <p className="text-sm text-muted-foreground mt-1">{tagline}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            <Button size="sm" variant="outline" onClick={() => setHistoryOpen(true)} className="flex-1 sm:flex-none min-w-0">
              <FileText className="w-4 h-4 mr-1 flex-shrink-0" /> <span className="truncate">Talent Monetization History</span>
            </Button>
            <Button size="sm" variant="outline" onClick={() => {
              if (orgSlug) {
                navigate(`/org/${orgSlug}?tab=distribution`);
              } else {
                navigate('/organizations?tab=distribution');
              }
            }} className="flex-1 sm:flex-none min-w-0">
              <Building2 className="w-4 h-4 mr-1 flex-shrink-0" /> <span className="truncate">Manage Missions</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Phase stepper */}
      <div className="relative grid grid-cols-3 gap-1.5 sm:gap-2 mb-5 sm:mb-6">

        {(["branding", "systematization", "asset"] as Phase[]).map((p, idx) => {
          const meta = PHASE_META[p];
          const Icon = meta.icon;
          const order: Phase[] = ["branding", "systematization", "asset"];
          const currentIdx = order.indexOf(state.current_phase);
          const isUnlocked = idx <= currentIdx;
          const isActive = p === state.current_phase;
          return (
            <button
              key={p}
              onClick={() => isUnlocked && jumpPhase(p)}
              disabled={!isUnlocked}
              className={cn(
                "rounded-xl border p-2 sm:p-3 text-left transition-all min-w-0",
                isActive ? "border-primary bg-primary/10 shadow-sm" : "border-border bg-card hover:border-primary/40",
                !isUnlocked && "opacity-50 cursor-not-allowed",
              )}
            >
              <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                <div className={cn("w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0",
                  isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                  {idx + 1}
                </div>
                <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                {!isUnlocked && <Lock className="w-3 h-3 text-muted-foreground ml-auto flex-shrink-0" />}
              </div>
              <p className="font-semibold text-xs sm:text-sm text-foreground leading-tight">{meta.label}</p>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-tight mt-0.5">{meta.sub}</p>
            </button>

          );
        })}
      </div>

      {/* Phase content */}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : state.current_phase === "branding" ? (
        <BrandingPhase
          done={done}
          autoCounts={autoCounts}
          state={state}
          milestones={milestones}
          progress={brandingProgress}
          onToggleMilestone={toggleMilestone}
          onUpdateState={upsertState}
          onAdvance={() => advanceToPhase("systematization")}
        />
      ) : state.current_phase === "systematization" ? (
        <SystematizationPhase
          done={done}
          autoCounts={autoCounts}
          milestones={milestones}
          state={state}
          progress={systProgress}
          onToggleMilestone={toggleMilestone}
          onUpdateState={upsertState}
          onAdvance={() => advanceToPhase("asset")}
          userId={userId}
          brandName={title}
          orgSlug={orgSlug}
          onOpenOrg={ensureOrgAndOpen}

        />

      ) : (
        <AssetPhase state={state} />
      )}



      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} currentUserId={userId} entityLabel={title} />
      <MissionHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} userId={userId} />
    </div>
  );
}

// ---- Phase 1: Branding ----
function MilestoneRow({ done, label, hint, actionLabel, onToggle, auto }: { done: boolean; label: string; hint?: string; actionLabel?: string; onToggle?: () => void; auto?: boolean }) {
  const canClick = !!onToggle && !auto;
  const Wrapper: any = canClick ? "button" : "div";
  const wrapperProps = canClick
    ? { type: "button", onClick: onToggle, "aria-pressed": done, "aria-label": done ? `Uncheck ${label}` : `Check ${label}` }
    : {};
  return (
    <Wrapper
      {...wrapperProps}
      className={cn(
        "w-full text-left flex items-start gap-3 p-3 rounded-lg border bg-card transition",
        done ? "border-emerald-500/40" : "border-border",
        canClick ? "cursor-pointer hover:border-primary/50 hover:bg-muted/30" : "cursor-default"
      )}
    >
      <div className={cn("w-5 h-5 mt-0.5 rounded-full flex items-center justify-center flex-shrink-0",
        done ? "bg-emerald-500 text-white" : "border-2 border-muted-foreground/40")}>
        {done && <Check className="w-3 h-3" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      {done && auto && <Badge variant="outline" className="text-[10px]">Auto</Badge>}
      {!done && actionLabel && canClick && actionLabel !== "Mark done" && (
        <span className="text-xs font-medium text-primary self-center">{actionLabel} →</span>
      )}
    </Wrapper>
  );
}



function BrandingPhase({ done, autoCounts, state, milestones, progress, onToggleMilestone, onUpdateState, onAdvance }: {
  done: any; autoCounts: any; state: VentureState; milestones: Set<string>; progress: number;
  onToggleMilestone: (k: string, on: boolean) => void; onUpdateState: (p: Partial<VentureState>) => void; onAdvance: () => void;
}) {

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="font-display text-base font-bold text-foreground">Phase 1 · Structure (Branding)</p>
            <p className="text-xs text-muted-foreground">Establish your consulting business. Ownership stays 100% yours.</p>
          </div>
          <Badge variant="secondary">{progress}%</Badge>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      <div className="space-y-2">
        <MilestoneRow
          done={done.professional_presence}
          auto={autoCounts.professionalPresence}
          label="Establish your professional presence"
          hint="Complete profile: name, avatar, bio/title"
          actionLabel={milestones.has("professional_presence") ? "Undo" : "Confirm"}
          onToggle={autoCounts.professionalPresence ? undefined : () => onToggleMilestone("professional_presence", !milestones.has("professional_presence"))}
        />
        <MilestoneRow
          done={done.solo_missions}
          auto={autoCounts.soloMissions >= 3}
          label="Deliver 3 solo consulting missions"
          hint={`${autoCounts.soloMissions}/3 closed missions${milestones.has("solo_missions") ? " · manually confirmed" : ""}`}
          actionLabel={milestones.has("solo_missions") ? "Undo" : "Mark done"}
          onToggle={autoCounts.soloMissions >= 3 ? undefined : () => onToggleMilestone("solo_missions", !milestones.has("solo_missions"))}
        />
        <MilestoneRow
          done={done.contractor_missions}
          auto={autoCounts.contractorMissions >= 7}
          label="Deliver 7 missions with contractors"
          hint={`${autoCounts.contractorMissions}/7 closed missions${milestones.has("contractor_missions") ? " · manually confirmed" : ""}`}
          actionLabel={milestones.has("contractor_missions") ? "Undo" : "Mark done"}
          onToggle={autoCounts.contractorMissions >= 7 ? undefined : () => onToggleMilestone("contractor_missions", !milestones.has("contractor_missions"))}
        />

        <div className="p-3 rounded-lg border border-border bg-card space-y-2">
          <div className="flex items-start gap-3">
            <div className={cn("w-5 h-5 mt-0.5 rounded-full flex items-center justify-center flex-shrink-0",
              done.proposal_template ? "bg-emerald-500 text-white" : "border-2 border-muted-foreground/40")}>
              {done.proposal_template && <Check className="w-3 h-3" />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Build your proposal template</p>
              <p className="text-xs text-muted-foreground">Link a template (Notion, Google Doc, PDF, etc.)</p>
              <div className="flex gap-2 mt-2">
                <Input
                  value={state.proposal_template_url || ""}
                  onChange={(e) => onUpdateState({ proposal_template_url: e.target.value })}
                  placeholder="https://..."
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>
      </div>

      </div>


      {/* Asset deliverables */}
      <div className="pt-4 border-t border-border">
        <p className="font-semibold text-sm text-foreground mb-1">Transform expertise into scalable assets</p>
        <p className="text-xs text-muted-foreground mb-3">Optional in this phase — required to scale to Phase 3.</p>
        <div className="grid sm:grid-cols-2 gap-2">
          <AssetInput icon={FileText} label="Frameworks & Playbooks" placeholder="Link to your framework"
            value={state.frameworks_url || ""} onChange={(v) => onUpdateState({ frameworks_url: v })} />
          <AssetInput icon={Cpu} label="Software & Tools" placeholder="Tool name or link"
            value={state.software_tools || ""} onChange={(v) => onUpdateState({ software_tools: v })} />
          <AssetInput icon={Database} label="Datasets & Methodologies" placeholder="Describe or link"
            value={state.datasets_methodologies || ""} onChange={(v) => onUpdateState({ datasets_methodologies: v })} />
          <AssetInput icon={GraduationCap} label="Training Courses" placeholder="Course name or link"
            value={state.training_courses || ""} onChange={(v) => onUpdateState({ training_courses: v })} />
        </div>
      </div>

      {progress === 100 && (
        <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex items-start gap-2 flex-1">
            <ArrowRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-sm text-foreground">Phase 1 complete. Ready to <strong>Systematize</strong> and detach the business from the founder.</p>
          </div>
          <Button size="sm" onClick={onAdvance} className="w-full sm:w-auto">Continue to Phase 2</Button>
        </div>
      )}


    </div>
  );
}

function AssetInput({ icon: Icon, label, placeholder, value, onChange }: { icon: any; label: string; placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="p-2.5 rounded-lg border border-border bg-card">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        <Label className="text-xs font-medium">{label}</Label>
        {value && <Check className="w-3 h-3 text-emerald-500 ml-auto" />}
      </div>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-7 text-xs" />
    </div>
  );
}

// ---- Phase 2: Systematization ----
function SystematizationPhase({ done, autoCounts, milestones, state, progress, onToggleMilestone, onUpdateState, onAdvance, userId, brandName, orgSlug, onOpenOrg }: {
  done: any; autoCounts: any; milestones: Set<string>; state: VentureState; progress: number;
  onToggleMilestone: (k: string, on: boolean) => void; onUpdateState: (p: Partial<VentureState>) => void; onAdvance: () => void;
  userId: string; brandName: string; orgSlug: string | null; onOpenOrg: () => void;
}) {
  const [inviteOpen, setInviteOpen] = useState(false);
  const gateOpen = autoCounts.hasDistribution && autoCounts.hasDeclaration;
  return (
    <div className="space-y-5">

      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="font-display text-base font-bold text-foreground">Phase 2 · Detach (Systemize)</p>
            <p className="text-xs text-muted-foreground">Separate the business from you. Build systems others can run.</p>
          </div>
          <Badge variant="secondary">{progress}%</Badge>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      {/* Model selector */}
      <div>
        <p className="text-sm font-semibold mb-2">Choose your business model</p>
        <div className="grid sm:grid-cols-2 gap-2">
          {(Object.keys(MODEL_META) as Model[]).map((m) => {
            const meta = MODEL_META[m];
            const Icon = meta.icon;
            const selected = state.selected_model === m;
            return (
              <button
                key={m}
                onClick={() => onUpdateState({ selected_model: m })}
                className={cn("text-left p-3 rounded-lg border transition-all",
                  selected ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40")}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-4 h-4 text-primary" />
                  <p className="font-semibold text-sm">{meta.label}</p>
                  {selected && <Check className="w-4 h-4 text-primary ml-auto" />}
                </div>
                <p className="text-xs text-muted-foreground">{meta.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {!state.selected_model ? (
        <div className="p-3 rounded-lg border border-dashed border-border bg-muted/30 text-center">
          <p className="text-xs text-muted-foreground">Choose a business model above to unlock the next actions.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* 1. Invite a co-builder */}
          <MilestoneRow
            done={done.invite_cobuilder}
            label="Invite a co-builder (optional)"
            hint={done.invite_cobuilder ? "Invitation sent" : "Optional — from the platform, or by email if they're not on it yet"}
            actionLabel={done.invite_cobuilder ? "Invite another" : "Invite"}
            onToggle={done.invite_cobuilder ? () => onToggleMilestone("invite_cobuilder", false) : () => setInviteOpen(true)}
          />

          {/* 2. Define your core services */}
          <MilestoneRow
            done={done.core_services}
            auto={autoCounts.coreServices >= 3}
            label="Define your core services"
            hint={autoCounts.coreServices > 0 ? `${autoCounts.coreServices}/3 services published` : (milestones.has("core_services") ? "Manually confirmed" : "Publish at least 3 consulting services")}
            actionLabel={milestones.has("core_services") ? "Undo" : "Mark done"}
            onToggle={autoCounts.coreServices >= 3 ? undefined : () => onToggleMilestone("core_services", !milestones.has("core_services"))}
          />

          {/* 3. Manage organization — auto-checked once org has ≥1 linked declaration mission and ≥1 distribution */}
          <MilestoneRow
            done={done.manage_org}

            label="Manage organization (optional)"
            hint={
              orgSlug
                ? (done.manage_org
                    ? `Linked to “${brandName}” · declaration + distribution recorded`
                    : `Open “${brandName}”. Auto-checks once one declaration and one distribution are linked.`)
                : `Create the “${brandName}” organization to manage it. Auto-checks once one declaration and one distribution are linked.`
            }
            actionLabel={orgSlug ? "Open" : "Create & open"}
            onToggle={onOpenOrg}
          />

          {gateOpen ? (
            <>
              {/* 4. Form the company */}
              <div className="p-3 rounded-lg border border-border bg-card space-y-2">
                <div className="flex items-start gap-3">
                  <div className={cn("w-5 h-5 mt-0.5 rounded-full flex items-center justify-center flex-shrink-0",
                    done.form_company ? "bg-emerald-500 text-white" : "border-2 border-muted-foreground/40")}>
                    {done.form_company && <Check className="w-3 h-3" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Form the company</p>
                    <p className="text-xs text-muted-foreground">Legal entity name and registration</p>
                    <div className="grid sm:grid-cols-2 gap-2 mt-2">
                      <Input value={state.company_name || ""} onChange={(e) => onUpdateState({ company_name: e.target.value })} placeholder="Company legal name" className="h-8 text-xs" />
                      <Input value={state.company_registration || ""} onChange={(e) => onUpdateState({ company_registration: e.target.value })} placeholder="Registration # (optional)" className="h-8 text-xs" />
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. Implement standardized processes */}
              <MilestoneRow
                done={done.standardized_processes}
                label="Implement standardized processes"
                hint="Documented playbooks, SOPs, delivery methodology"
                actionLabel="Mark done"
                onToggle={() => onToggleMilestone("standardized_processes", !done.standardized_processes)}
              />
            </>
          ) : (
            <div className="p-3 rounded-lg border border-dashed border-border bg-muted/30 text-center">
              <p className="text-xs text-muted-foreground">
                Add at least one <strong>Distribution</strong> and one <strong>Declaration</strong> entry for this venture to unlock <em>Form the company</em> and <em>Implement standardized processes</em>.
              </p>
            </div>
          )}


          {done.form_company && done.standardized_processes && (
            <MilestoneRow
              done={done.autonomous_operations}
              label="Achieve autonomous operations"
              hint="The business no longer depends on your daily involvement"
              onToggle={() => onUpdateState({ autonomous_operations: !state.autonomous_operations })}
            />
          )}
        </div>
      )}





      {progress === 100 && (
        <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex items-start gap-2 flex-1">
            <ArrowRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-sm text-foreground">Phase 2 complete. The business is detached. Ready to become an <strong>Asset</strong>.</p>
          </div>
          <Button size="sm" onClick={onAdvance} className="w-full sm:w-auto">Continue to Phase 3</Button>
        </div>
      )}


      <CoBuilderInviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        currentUserId={userId}
        brandName={brandName}
        onInvited={() => onToggleMilestone("invite_cobuilder", true)}
      />
    </div>
  );
}

function CoBuilderInviteDialog({ open, onOpenChange, currentUserId, brandName, onInvited }: {
  open: boolean; onOpenChange: (v: boolean) => void; currentUserId: string; brandName: string; onInvited: () => void;
}) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"platform" | "email">("platform");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProfileMatch[]>([]);
  const [searching, setSearching] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!query.trim() || query.trim().length < 2) { setResults([]); return; }
      setSearching(true);
      const { data } = await supabase.from("profiles").select("user_id, full_name, avatar_url, primary_skills").ilike("full_name", `%${query.trim()}%`).neq("user_id", currentUserId).limit(10);
      setResults((data as ProfileMatch[]) || []);
      setSearching(false);
    }, 250);
    return () => clearTimeout(t);
  }, [query, currentUserId]);

  const invitePlatform = async (target: ProfileMatch) => {
    setInviting(target.user_id);
    try {
      const { data: existing } = await supabase.from("direct_conversations").select("id")
        .or(`and(participant_one_id.eq.${currentUserId},participant_two_id.eq.${target.user_id}),and(participant_one_id.eq.${target.user_id},participant_two_id.eq.${currentUserId})`)
        .maybeSingle();
      let convId = existing?.id;
      if (!convId) {
        const { data: created, error } = await supabase.from("direct_conversations").insert({ participant_one_id: currentUserId, participant_two_id: target.user_id }).select("id").single();
        if (error) throw error;
        convId = created.id;
      }
      const message = `Hi ${target.full_name || "there"} — I'm systematizing "${brandName}" and looking for a co-builder to bring in capabilities the venture needs. Interested in exploring a role together?`;
      const { error: msgErr } = await supabase.from("direct_messages").insert({ conversation_id: convId, sender_id: currentUserId, content: message });
      if (msgErr) throw msgErr;
      onInvited();
      toast.success(`Invitation sent to ${target.full_name || "co-builder"}`);
      onOpenChange(false);
      navigate(`/messages/${convId}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to send invitation");
    } finally { setInviting(null); }
  };

  const inviteEmail = async () => {
    const clean = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) { toast.error("Enter a valid email"); return; }
    setSendingEmail(true);
    const { error } = await supabase.functions.invoke("send-collaborator-invite", {
      body: { email: clean, entityName: brandName, access: "edit" },
    });
    setSendingEmail(false);
    if (error) { toast.error("Failed to send email invite"); return; }
    onInvited();
    toast.success(`Email invitation sent to ${clean}`);
    setEmail("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UserPlus className="w-4 h-4" /> Invite a Co-Builder</DialogTitle>
          <DialogDescription>Search a member of the platform, or invite by email.</DialogDescription>
        </DialogHeader>

        <div className="flex gap-1 p-1 rounded-lg bg-muted">
          <button
            onClick={() => setMode("platform")}
            className={cn("flex-1 text-xs font-medium py-1.5 rounded-md transition", mode === "platform" ? "bg-background shadow-sm" : "text-muted-foreground")}
          >From the platform</button>
          <button
            onClick={() => setMode("email")}
            className={cn("flex-1 text-xs font-medium py-1.5 rounded-md transition", mode === "email" ? "bg-background shadow-sm" : "text-muted-foreground")}
          >By email</button>
        </div>

        {mode === "platform" ? (
          <>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search profiles by name…" className="pl-9" />
            </div>
            <div className="max-h-72 overflow-y-auto space-y-1 -mx-2 px-2">
              {searching && (<div className="flex items-center justify-center py-6 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Searching…</div>)}
              {!searching && query.trim().length >= 2 && results.length === 0 && (
                <div className="text-center py-6 space-y-2">
                  <p className="text-sm text-muted-foreground">No profiles found.</p>
                  <Button size="sm" variant="outline" onClick={() => setMode("email")}>Invite by email instead</Button>
                </div>
              )}
              {!searching && results.map((r) => (
                <div key={r.user_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                  <Avatar className="w-9 h-9">{r.avatar_url && <AvatarImage src={r.avatar_url} />}<AvatarFallback>{(r.full_name || "?").charAt(0).toUpperCase()}</AvatarFallback></Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{r.full_name || "Unnamed"}</p>
                    {r.primary_skills && <p className="text-xs text-muted-foreground truncate">{r.primary_skills}</p>}
                  </div>
                  <Button size="sm" variant="outline" disabled={inviting === r.user_id} onClick={() => invitePlatform(r)}>
                    {inviting === r.user_id ? (<Loader2 className="w-3.5 h-3.5 animate-spin" />) : (<><Send className="w-3.5 h-3.5 mr-1" /> Invite</>)}
                  </Button>
                </div>
              ))}
              {query.trim().length < 2 && (<p className="text-xs text-muted-foreground text-center py-6">Type at least 2 characters to search.</p>)}
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Email address</Label>
              <Input autoFocus type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="colleague@example.com" className="mt-1" />
              <p className="text-[11px] text-muted-foreground mt-1">They'll receive an invitation email with a link to join the platform and connect with you.</p>
            </div>
            <Button className="w-full" onClick={inviteEmail} disabled={sendingEmail || !email.trim()}>
              {sendingEmail ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…</>) : (<><Send className="w-4 h-4 mr-2" /> Send email invitation</>)}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}



// ---- Phase 3: Asset ----
function AssetPhase({ state }: { state: VentureState }) {
  const model = state.selected_model ? MODEL_META[state.selected_model] : null;
  return (
    <div className="space-y-4">
      <div>
        <p className="font-display text-base font-bold text-foreground">Phase 3 · Asset (Scale)</p>
        <p className="text-xs text-muted-foreground">Your consulting business operates as an autonomous, scalable asset.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <SummaryTile icon={Building2} label="Business model" value={model?.label || "—"} />
        <SummaryTile icon={FileText} label="Company" value={state.company_name || "—"} />
        <SummaryTile icon={LinkIcon} label="Proposal template" value={state.proposal_template_url ? "Linked" : "—"} />
        <SummaryTile icon={Layers} label="Frameworks" value={state.frameworks_url ? "Linked" : "—"} />
        <SummaryTile icon={Cpu} label="Software & tools" value={state.software_tools ? "Defined" : "—"} />
        <SummaryTile icon={Database} label="Datasets" value={state.datasets_methodologies ? "Defined" : "—"} />
        <SummaryTile icon={GraduationCap} label="Training courses" value={state.training_courses ? "Defined" : "—"} />
        <SummaryTile icon={Rocket} label="Autonomous ops" value={state.autonomous_operations ? "Active" : "—"} />
      </div>

      <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
        <p className="font-semibold text-sm text-foreground mb-1">Asset Phase Result</p>
        <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
          <li>The business operates as an autonomous system.</li>
          <li>Consulting is delivered by trained collaborators, not only by you.</li>
          <li>The brand scales independently of your direct involvement.</li>
        </ul>
      </div>
    </div>
  );
}

function SummaryTile({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg border border-border bg-card">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      </div>
      <p className="text-sm font-semibold text-foreground truncate">{value}</p>
    </div>
  );
}

// ---- Mission history (unchanged behavior) ----
interface Mission {
  id: string; title: string; client_name: string | null; offer_date: string | null;
  number_of_days: number | null; amount_per_day: number | null; total_amount: number | null;
  currency: string; paid_amount: number | null; paid_at: string | null;
}

function MissionHistoryDialog({ open, onOpenChange, userId }: { open: boolean; onOpenChange: (v: boolean) => void; userId: string; }) {
  const [loading, setLoading] = useState(false);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Mission>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("consultant_opportunities")
        .select("id,title,client_name,offer_date,number_of_days,amount_per_day,total_amount,currency,paid_amount,paid_at")
        .eq("user_id", userId)
        .eq("stage", "closed")
        .order("offer_date", { ascending: false, nullsFirst: false });
      if (!error) setMissions((data as Mission[]) || []);
      setLoading(false);
    })();
  }, [open, userId]);

  const startEdit = (m: Mission) => {
    setEditingId(m.id);
    setDraft({
      client_name: m.client_name, offer_date: m.offer_date, number_of_days: m.number_of_days,
      amount_per_day: m.amount_per_day, currency: m.currency, paid_amount: m.paid_amount, paid_at: m.paid_at,
    });
  };
  const cancelEdit = () => { setEditingId(null); setDraft({}); };
  const saveEdit = async (id: string) => {
    setSaving(true);
    const payload: Record<string, unknown> = {
      client_name: draft.client_name ?? null,
      offer_date: draft.offer_date || null,
      number_of_days: draft.number_of_days ?? null,
      amount_per_day: draft.amount_per_day ?? null,
      currency: draft.currency || "TND",
      paid_amount: draft.paid_amount ?? null,
      paid_at: draft.paid_at || null,
    };
    const { error } = await supabase.from("consultant_opportunities").update(payload).eq("id", id).eq("user_id", userId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Mission updated");
    setMissions((prev) => prev.map((m) => m.id === id ? { ...m, ...payload, total_amount: (Number(payload.number_of_days) || 0) * (Number(payload.amount_per_day) || 0) } as Mission : m));
    cancelEdit();
  };

  const totalRevenue = missions.reduce((s, m) => s + Number(m.total_amount || 0), 0);
  const totalPaid = missions.reduce((s, m) => s + Number(m.paid_amount || 0), 0);
  const currency = missions[0]?.currency || "TND";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileText className="w-4 h-4" /> Mission History — Accounting</DialogTitle>
          <DialogDescription>Closed consulting missions that qualified you for Talent Monetized. Edit accounting details inline.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-3 border-y border-border py-3">
          <div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Missions closed</p><p className="text-lg font-bold text-foreground">{missions.length}</p></div>
          <div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total billed</p><p className="text-lg font-bold text-foreground">{totalRevenue.toLocaleString()} {currency}</p></div>
          <div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total paid</p><p className="text-lg font-bold text-emerald-600">{totalPaid.toLocaleString()} {currency}</p></div>
        </div>
        <div className="flex-1 overflow-y-auto -mx-2 px-2">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading missions…</div>
          ) : missions.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-10">No closed missions yet.</p>
          ) : (
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="text-left font-medium py-2 px-2">Mission / Client</th>
                  <th className="text-left font-medium py-2 px-2">Date</th>
                  <th className="text-right font-medium py-2 px-2">Days</th>
                  <th className="text-right font-medium py-2 px-2">Rate</th>
                  <th className="text-right font-medium py-2 px-2">Total</th>
                  <th className="text-right font-medium py-2 px-2">Paid</th>
                  <th className="text-right font-medium py-2 px-2">Paid on</th>
                  <th className="py-2 px-2"></th>
                </tr>
              </thead>
              <tbody>
                {missions.map((m) => {
                  const isEditing = editingId === m.id;
                  return (
                    <tr key={m.id} className="border-b border-border/50 align-top">
                      <td className="py-2 px-2">
                        <div className="font-medium text-foreground">{m.title}</div>
                        {isEditing ? (
                          <Input value={draft.client_name ?? ""} onChange={(e) => setDraft({ ...draft, client_name: e.target.value })} placeholder="Client" className="h-7 text-xs mt-1" />
                        ) : (<div className="text-muted-foreground">{m.client_name || "—"}</div>)}
                      </td>
                      <td className="py-2 px-2">{isEditing ? (<Input type="date" value={draft.offer_date ?? ""} onChange={(e) => setDraft({ ...draft, offer_date: e.target.value })} className="h-7 text-xs" />) : (m.offer_date || "—")}</td>
                      <td className="py-2 px-2 text-right">{isEditing ? (<Input type="number" value={draft.number_of_days ?? ""} onChange={(e) => setDraft({ ...draft, number_of_days: Number(e.target.value) })} className="h-7 text-xs w-16 ml-auto text-right" />) : (m.number_of_days ?? "—")}</td>
                      <td className="py-2 px-2 text-right">{isEditing ? (<Input type="number" step="0.01" value={draft.amount_per_day ?? ""} onChange={(e) => setDraft({ ...draft, amount_per_day: Number(e.target.value) })} className="h-7 text-xs w-24 ml-auto text-right" />) : (`${Number(m.amount_per_day || 0).toLocaleString()}`)}</td>
                      <td className="py-2 px-2 text-right font-medium">{Number(m.total_amount || 0).toLocaleString()} {m.currency}</td>
                      <td className="py-2 px-2 text-right">{isEditing ? (<Input type="number" step="0.01" value={draft.paid_amount ?? ""} onChange={(e) => setDraft({ ...draft, paid_amount: Number(e.target.value) })} className="h-7 text-xs w-24 ml-auto text-right" />) : (`${Number(m.paid_amount || 0).toLocaleString()}`)}</td>
                      <td className="py-2 px-2 text-right">{isEditing ? (<Input type="date" value={(draft.paid_at ?? "").toString().slice(0,10)} onChange={(e) => setDraft({ ...draft, paid_at: e.target.value })} className="h-7 text-xs" />) : (m.paid_at ? m.paid_at.slice(0,10) : "—")}</td>
                      <td className="py-2 px-2 text-right whitespace-nowrap">
                        {isEditing ? (
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveEdit(m.id)} disabled={saving}>
                              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEdit}><X className="w-3 h-3" /></Button>
                          </div>
                        ) : (
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(m)}><Pencil className="w-3 h-3" /></Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---- Invite dialog (unchanged) ----
function InviteDialog({ open, onOpenChange, currentUserId, entityLabel }: { open: boolean; onOpenChange: (v: boolean) => void; currentUserId: string; entityLabel: string; }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProfileMatch[]>([]);
  const [searching, setSearching] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!query.trim() || query.trim().length < 2) { setResults([]); return; }
      setSearching(true);
      const { data } = await supabase.from("profiles").select("user_id, full_name, avatar_url, primary_skills").ilike("full_name", `%${query.trim()}%`).neq("user_id", currentUserId).limit(10);
      setResults((data as ProfileMatch[]) || []);
      setSearching(false);
    }, 250);
    return () => clearTimeout(t);
  }, [query, currentUserId]);

  const handleInvite = async (target: ProfileMatch) => {
    setInviting(target.user_id);
    try {
      const { data: existing } = await supabase.from("direct_conversations").select("id")
        .or(`and(participant_one_id.eq.${currentUserId},participant_two_id.eq.${target.user_id}),and(participant_one_id.eq.${target.user_id},participant_two_id.eq.${currentUserId})`)
        .maybeSingle();
      let convId = existing?.id;
      if (!convId) {
        const { data: created, error } = await supabase.from("direct_conversations").insert({ participant_one_id: currentUserId, participant_two_id: target.user_id }).select("id").single();
        if (error) throw error;
        convId = created.id;
      }
      const message = `Hi ${target.full_name || "there"} — I'm inviting you to co-build with me on "${entityLabel}". Interested in exploring a role together?`;
      const { error: msgErr } = await supabase.from("direct_messages").insert({ conversation_id: convId, sender_id: currentUserId, content: message });
      if (msgErr) throw msgErr;
      toast.success(`Invitation sent to ${target.full_name || "co-builder"}`);
      onOpenChange(false);
      navigate(`/messages/${convId}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to send invitation");
    } finally { setInviting(null); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UserPlus className="w-4 h-4" /> Invite a Co-Builder</DialogTitle>
          <DialogDescription>Search by name and send a direct invitation to co-build.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search profiles by name…" className="pl-9" />
        </div>
        <div className="max-h-72 overflow-y-auto space-y-1 -mx-2 px-2">
          {searching && (<div className="flex items-center justify-center py-6 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Searching…</div>)}
          {!searching && query.trim().length >= 2 && results.length === 0 && (<p className="text-sm text-muted-foreground text-center py-6">No profiles found.</p>)}
          {!searching && results.map((r) => (
            <div key={r.user_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
              <Avatar className="w-9 h-9">{r.avatar_url && <AvatarImage src={r.avatar_url} />}<AvatarFallback>{(r.full_name || "?").charAt(0).toUpperCase()}</AvatarFallback></Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{r.full_name || "Unnamed"}</p>
                {r.primary_skills && <p className="text-xs text-muted-foreground truncate">{r.primary_skills}</p>}
              </div>
              <Button size="sm" variant="outline" disabled={inviting === r.user_id} onClick={() => handleInvite(r)}>
                {inviting === r.user_id ? (<Loader2 className="w-3.5 h-3.5 animate-spin" />) : (<><Send className="w-3.5 h-3.5 mr-1" /> Invite</>)}
              </Button>
            </div>
          ))}
          {query.trim().length < 2 && (<p className="text-xs text-muted-foreground text-center py-6">Type at least 2 characters to search.</p>)}
        </div>
      </DialogContent>
    </Dialog>
  );
}
