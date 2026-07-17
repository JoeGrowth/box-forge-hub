// Organization detail page — /org/:slug
// Tabs: Overview / Jobs / Tenders / Members
// Editor+ can publish jobs and tenders on behalf of the organization.
// Viewer can browse but not edit.

import { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  useOrganizationBySlug,
  useMyOrgRole,
  useOrgMembers,
  roleAtLeast,
  type OrgRole,
} from "@/hooks/useOrganizations";
import { OrgLogo, invalidateOrgLogo } from "@/components/organization/OrgLogo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Building2,
  Plus,
  Briefcase,
  FileText,
  Users,
  Shield,
  Pencil,
  Eye,
  Globe,
  Lock,
  ExternalLink,
  Trash2,
  ArrowLeft,
  ClipboardList,
  ArrowRight,
  PieChart,
  Scale,
  Upload,
  Download,
  FilePlus,
  Rocket,
  Sparkles,
  TrendingUp,
  Trophy,
  CalendarCheck,
  CheckCircle2,
  Circle,
  Presentation,
  Lightbulb,
  History,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  DollarSign,
} from "lucide-react";
import jsPDF from "jspdf";
import { readDistEntities, addDistEntity, writeDistEntities, type DistEntity } from "@/pages/Distribution";

type LifecycleStage = "venture" | "business" | "startup" | "mature";
const STAGE_META: Record<LifecycleStage, { label: string; icon: typeof Rocket; className: string }> = {
  venture:  { label: "Venture",        icon: Rocket,     className: "bg-blue-500/10 text-blue-700 border-blue-200" },
  business: { label: "Business",       icon: Sparkles,   className: "bg-emerald-500/10 text-emerald-700 border-emerald-200" },
  startup:  { label: "Startup",        icon: TrendingUp, className: "bg-purple-500/10 text-purple-700 border-purple-200" },
  mature:   { label: "Mature company", icon: Trophy,     className: "bg-amber-500/10 text-amber-700 border-amber-200" },
};


type JobRow = {
  id: string;
  title: string;
  description: string;
  status: string;
  visibility_scope: string;
  location: string | null;
  employment_type: string | null;
  created_at: string;
};
type TenderRow = {
  id: string;
  title: string;
  description: string;
  status: string;
  visibility_scope: string;
  budget_range: string | null;
  deadline: string | null;
  created_at: string;
};

const ROLE_ICON = { admin: Shield, editor: Pencil, viewer: Eye } as const;
const ROLE_COLOR = {
  admin: "bg-primary/10 text-primary",
  editor: "bg-amber-500/10 text-amber-600",
  viewer: "bg-muted text-muted-foreground",
} as const;

const SCOPE_ICON = { global: Globe, organization: Building2, private: Lock } as const;

type DailyTask = { id: string; text: string; done: boolean; created_at: string };
type DailyPresentation = { id: string; title: string; url: string; created_at: string };

export default function OrganizationPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const { org: loadedOrg, loading } = useOrganizationBySlug(slug);
  const [org, setOrg] = useState<typeof loadedOrg>(loadedOrg);
  useEffect(() => { setOrg(loadedOrg); }, [loadedOrg]);
  const role = useMyOrgRole(user?.id, org?.id);
  const canEdit = roleAtLeast(role, "editor");
  const canAdmin = roleAtLeast(role, "admin");
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [tenders, setTenders] = useState<TenderRow[]>([]);
  const [declarations, setDeclarations] = useState<{ id: string; name: string; created_at: string }[]>([]);
  const [legalDocs, setLegalDocs] = useState<{ id: string; name: string; storage_path: string; created_at: string; size_bytes: number | null }[]>([]);
  const [newDeclName, setNewDeclName] = useState("");
  const [creatingDecl, setCreatingDecl] = useState(false);
  const { members, reload: reloadMembers } = useOrgMembers(org?.id);

  type TenderInterest = { interaction_id: string; user_id: string; full_name: string | null; message: string | null; status: string; created_at: string };
  type TenderSubmission = { id: string; tender_id: string; user_id: string; user_name: string | null; note: string | null; file_path: string | null; file_name: string | null; status: string; reviewer_notes: string | null; paid_at: string | null; created_at: string };
  const [tenderInterests, setTenderInterests] = useState<Record<string, { count: number; items: TenderInterest[] }>>({});
  const [tenderSubmissions, setTenderSubmissions] = useState<Record<string, TenderSubmission[]>>({});
  const [viewingTender, setViewingTender] = useState<{ id: string; title: string } | null>(null);

  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>([]);
  useEffect(() => {
    if (!org?.id) return;
    try {
      setDailyTasks(JSON.parse(localStorage.getItem(`org-daily-tasks:${org.id}`) || "[]"));
    } catch { setDailyTasks([]); }
  }, [org?.id]);

  const saveDailyTasks = useCallback((next: DailyTask[]) => {
    setDailyTasks(next);
    if (org?.id) localStorage.setItem(`org-daily-tasks:${org.id}`, JSON.stringify(next));
  }, [org?.id]);

  const dailyOpenCount = dailyTasks.filter(t => !t.done).length;

  const loadOpps = useCallback(async () => {
    if (!org) return;
    const [{ data: js }, { data: ts }, { data: ds }, { data: lg }] = await Promise.all([
      supabase.from("job_opportunities").select("*").eq("organization_id", org.id).order("created_at", { ascending: false }),
      supabase.from("tenders").select("*").eq("organization_id", org.id).order("created_at", { ascending: false }),
      supabase.from("declaration_entities").select("id, name, created_at").eq("organization_id", org.id).order("created_at", { ascending: true }),
      supabase.from("organization_legal_documents").select("id, name, storage_path, created_at, size_bytes").eq("organization_id", org.id).order("created_at", { ascending: false }),
    ]);
    const tenderRows = (ts as TenderRow[]) ?? [];
    setJobs((js as JobRow[]) ?? []);
    setTenders(tenderRows);
    setDeclarations((ds as any) ?? []);
    setLegalDocs((lg as any) ?? []);

    if (tenderRows.length > 0) {
      const ids = tenderRows.map((t) => t.id);
      const { data: ints } = await supabase
        .from("opportunity_interactions")
        .select("id, opportunity_id, user_id, message, status, created_at")
        .in("opportunity_id", ids)
        .order("created_at", { ascending: false });
      const items = (ints as any[]) ?? [];
      const userIds = [...new Set(items.map((i) => i.user_id).filter(Boolean))];
      const { data: profs } = userIds.length
        ? await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds)
        : { data: [] };
      const nameMap = new Map(((profs as any[]) ?? []).map((p) => [p.user_id, p.full_name]));
      const map: Record<string, { count: number; items: TenderInterest[] }> = {};
      for (const t of tenderRows) map[t.id] = { count: 0, items: [] };
      for (const i of items) {
        const entry = map[i.opportunity_id] ?? { count: 0, items: [] };
        entry.items.push({ interaction_id: i.id, user_id: i.user_id, full_name: nameMap.get(i.user_id) ?? null, message: i.message, status: i.status ?? "pending", created_at: i.created_at });
        entry.count++;
        map[i.opportunity_id] = entry;
      }
      setTenderInterests(map);

      // Load submissions for these tenders
      const { data: subs } = await supabase
        .from("tender_submissions")
        .select("*")
        .in("tender_id", ids)
        .order("created_at", { ascending: false });
      const subRows = (subs as any[]) ?? [];
      const subUserIds = [...new Set(subRows.map((s) => s.user_id).filter(Boolean))];
      const subNameMap = new Map<string, string | null>();
      if (subUserIds.length) {
        const { data: sp } = await supabase.from("profiles").select("user_id, full_name").in("user_id", subUserIds);
        for (const p of (sp as any[]) ?? []) subNameMap.set(p.user_id, p.full_name);
      }
      const sMap: Record<string, TenderSubmission[]> = {};
      for (const s of subRows) {
        (sMap[s.tender_id] ??= []).push({ ...s, user_name: subNameMap.get(s.user_id) ?? null });
      }
      setTenderSubmissions(sMap);
    } else {
      setTenderInterests({});
      setTenderSubmissions({});
    }
  }, [org]);

  useEffect(() => { loadOpps(); }, [loadOpps]);


  const createDeclaration = async () => {
    if (!org || !user || !newDeclName.trim()) return;
    setCreatingDecl(true);
    const { data, error } = await supabase
      .from("declaration_entities")
      .insert({ name: newDeclName.trim(), owner_id: user.id, organization_id: org.id })
      .select()
      .single();
    setCreatingDecl(false);
    if (error) {
      toast({ title: "Could not create declaration", description: error.message, variant: "destructive" });
      return;
    }
    setNewDeclName("");
    await loadOpps();
    navigate(`/declaration?entity=${data.id}`);
  };

  if (loading) return <div className="container mx-auto p-8 text-sm text-muted-foreground">Loading…</div>;
  if (!org) return (
    <div className="container mx-auto p-8">
      <p className="text-sm text-muted-foreground">Organization not found.</p>
      <Link to="/organizations" className="text-primary text-sm">Back to organizations</Link>
    </div>
  );

  return (
    <div className="container mx-auto px-4 pt-20 pb-8 max-w-6xl space-y-6">
      <Link to="/organizations" className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary bg-card border border-border rounded-lg px-3 py-2 shadow-sm w-fit">
        <ArrowLeft className="w-4 h-4" /> All organizations
      </Link>

      {/* Header */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-start gap-4 flex-wrap">
          <label
            className={`w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden relative group ${canEdit ? "cursor-pointer hover:ring-2 hover:ring-primary/40" : ""}`}
            title={canEdit ? "Click to upload logo" : undefined}
          >
            <OrgLogo
              path={org.logo_url}
              alt={`${org.name} logo`}
              className="w-full h-full object-cover"
              iconClassName="w-7 h-7 text-primary"
            />
            {canEdit && (
              <>
                <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-[10px] font-medium text-white">
                  {uploadingLogo ? "…" : "Change"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingLogo}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file || !org) return;
                    setUploadingLogo(true);
                    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
                    const path = `${org.id}/logo-${Date.now()}.${ext}`;
                    const { error: upErr } = await supabase.storage
                      .from("organization-logos")
                      .upload(path, file, { contentType: file.type, upsert: false });
                    if (upErr) {
                      setUploadingLogo(false);
                      toast({ title: "Upload failed", description: upErr.message, variant: "destructive" });
                      return;
                    }
                    // Delete previous logo if any
                    if (org.logo_url) {
                      await supabase.storage.from("organization-logos").remove([org.logo_url]);
                      invalidateOrgLogo(org.logo_url);
                    }
                    const { error: updErr } = await supabase
                      .from("organizations")
                      .update({ logo_url: path } as any)
                      .eq("id", org.id);
                    setUploadingLogo(false);
                    if (updErr) {
                      toast({ title: "Could not save logo", description: updErr.message, variant: "destructive" });
                      return;
                    }
                    setOrg({ ...org, logo_url: path });
                    toast({ title: "Logo updated" });
                  }}
                />
              </>
            )}
          </label>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{org.name}</h1>
              {(() => {
                const hasCert = legalDocs.some((d) => d.name.toLowerCase().startsWith("certificate of incorporation"));
                return (
                  <Badge variant="outline" className="capitalize">
                    {hasCert ? "Company" : "Organization"}
                  </Badge>
                );
              })()}
              {(() => {
                const stage = (org.lifecycle_stage ?? "venture") as LifecycleStage;
                const meta = STAGE_META[stage];
                const I = meta.icon;
                return (
                  <Badge variant="outline" className={meta.className}>
                    <I className="w-3 h-3 mr-1" /> {meta.label}
                  </Badge>
                );
              })()}
              {role && (
                <Badge className={ROLE_COLOR[role]}>
                  {(() => { const I = ROLE_ICON[role]; return <I className="w-3 h-3 mr-1" />; })()}
                  Your role: {role}
                </Badge>
              )}
            </div>
            {org.description && <p className="text-sm text-muted-foreground mt-2">{org.description}</p>}
            {org.website && (
              <a href={org.website} target="_blank" rel="noreferrer"
                 className="inline-flex items-center text-xs text-primary mt-2 hover:underline">
                {org.website} <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            )}
            {canAdmin && (
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <Label className="text-xs text-muted-foreground">Lifecycle stage:</Label>
                <Select
                  value={(org.lifecycle_stage ?? "venture") as string}
                  onValueChange={async (v) => {
                    const { error } = await supabase
                      .from("organizations")
                      .update({ lifecycle_stage: v } as any)
                      .eq("id", org.id);
                    if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
                    else { toast({ title: `Stage set to ${STAGE_META[v as LifecycleStage].label}` }); window.location.reload(); }
                  }}
                >
                  <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="venture">Venture</SelectItem>
                    <SelectItem value="business">Business (first paying customer)</SelectItem>
                    <SelectItem value="startup">Startup (searching repeatability)</SelectItem>
                    <SelectItem value="mature">Mature company</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground">Auto-upgrades to Business when a declaration mission is marked paid.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue={searchParams.get("tab") || "legal"} className="space-y-4">
        <TabsList className="flex-wrap h-auto justify-start">
          <TabsTrigger value="legal"><Scale className="w-3 h-3 mr-1" /> Legal ({legalDocs.length})</TabsTrigger>
          <TabsTrigger value="daily"><CalendarCheck className="w-3 h-3 mr-1" /> Daily ({dailyOpenCount})</TabsTrigger>
          {legalDocs.length >= 1 && (
            <>
              <TabsTrigger value="jobs"><Briefcase className="w-3 h-3 mr-1" /> Jobs ({jobs.length})</TabsTrigger>
              <TabsTrigger value="tenders"><FileText className="w-3 h-3 mr-1" /> Tenders ({tenders.length})</TabsTrigger>
            </>
          )}
          <TabsTrigger value="distribution"><PieChart className="w-3 h-3 mr-1" /> Distribution</TabsTrigger>
          <TabsTrigger value="declaration"><ClipboardList className="w-3 h-3 mr-1" /> Declaration ({declarations.length})</TabsTrigger>
          <TabsTrigger value="journey"><Lightbulb className="w-3 h-3 mr-1" /> Project Journey</TabsTrigger>
          <TabsTrigger value="members"><Users className="w-3 h-3 mr-1" /> Members ({members.length})</TabsTrigger>
        </TabsList>


        {/* JOBS */}
        <TabsContent value="jobs" className="space-y-3">
          <div className="flex justify-end">
            {canEdit && (
              <CreateOpportunityDialog
                kind="job"
                orgId={org.id}
                userId={user!.id}
                onCreated={loadOpps}
              />
            )}
          </div>
          {jobs.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="No jobs yet"
              hint={canEdit ? "Use the button above to publish the first one." : "An editor needs to publish one."}
            />
          ) : (
            jobs.map((j) => (
              <OppCard
                key={j.id}
                title={j.title}
                description={j.description}
                status={j.status}
                scope={j.visibility_scope}
                meta={[j.employment_type, j.location].filter(Boolean) as string[]}
                href={`/opportunities/job/${j.id}`}
                canManage={canEdit}
                canDelete={canAdmin}
                onDelete={async () => {
                  if (!confirm("Delete this job?")) return;
                  const { error } = await supabase.from("job_opportunities").delete().eq("id", j.id);
                  if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
                  else { toast({ title: "Job deleted" }); loadOpps(); }
                }}
              />
            ))
          )}
        </TabsContent>

        {/* TENDERS */}
        <TabsContent value="tenders" className="space-y-3">
          <div className="flex justify-end">
            {canEdit && (
              <CreateOpportunityDialog
                kind="tender"
                orgId={org.id}
                userId={user!.id}
                onCreated={loadOpps}
              />
            )}
          </div>
          {tenders.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No tenders yet"
              hint={canEdit ? "Publish a tender to source proposals." : "Only editors and admins can publish."}
            />
          ) : (
            tenders.map((t) => (
              <OppCard
                key={t.id}
                title={t.title}
                description={t.description}
                status={t.status}
                scope={t.visibility_scope}
                meta={[t.budget_range, t.deadline ? `Deadline ${new Date(t.deadline).toLocaleDateString()}` : null].filter(Boolean) as string[]}
                href={`/opportunities/tender/${t.id}`}
                canManage={canEdit}
                canDelete={canAdmin}
                onDelete={async () => {
                  if (!confirm("Delete this tender?")) return;
                  const { error } = await supabase.from("tenders").delete().eq("id", t.id);
                  if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
                  else { toast({ title: "Tender deleted" }); loadOpps(); }
                }}
                interestedCount={tenderInterests[t.id]?.count ?? 0}
                onViewInterested={() => setViewingTender({ id: t.id, title: t.title })}
              />
            ))
          )}

          <Dialog open={!!viewingTender} onOpenChange={(open) => !open && setViewingTender(null)}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>Manage {viewingTender?.title}</DialogTitle>
                <DialogDescription>Accept or refuse candidates, review deliverables, and confirm payment.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 overflow-auto pr-1">
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Interested people</div>
                  {(tenderInterests[viewingTender?.id ?? ""]?.items ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No interest yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {(tenderInterests[viewingTender?.id ?? ""]?.items ?? []).map((i) => (
                        <InterestRow
                          key={i.interaction_id}
                          interest={i}
                          onUpdate={loadOpps}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t border-border pt-3">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Deliverables</div>
                  {(tenderSubmissions[viewingTender?.id ?? ""] ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No deliverables submitted yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {(tenderSubmissions[viewingTender?.id ?? ""] ?? []).map((s) => (
                        <SubmissionRow key={s.id} submission={s} onUpdate={loadOpps} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* DECLARATION */}
        <TabsContent value="declaration" className="space-y-3">
          {canEdit && (
            <div className="rounded-xl border border-dashed border-border bg-card p-4 flex gap-2 flex-wrap items-end">
              <div className="flex-1 min-w-[220px]">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">New declaration entity</Label>
                <Input
                  value={newDeclName}
                  onChange={(e) => setNewDeclName(e.target.value)}
                  placeholder={`e.g. ${org.name} Q1 declaration`}
                  onKeyDown={(e) => e.key === "Enter" && createDeclaration()}
                />
              </div>
              <Button onClick={createDeclaration} disabled={creatingDecl || !newDeclName.trim()}>
                <Plus className="w-3 h-3 mr-1" /> {creatingDecl ? "Creating…" : "Add declaration"}
              </Button>
            </div>
          )}
          {declarations.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No declarations yet"
              hint={canEdit ? "Create one above. It will open in the full Declaration workspace." : "An editor needs to create one."}
            />
          ) : (
            <div className="rounded-xl border border-border bg-card divide-y divide-border">
              {declarations.map((d) => (
                <Link
                  key={d.id}
                  to={`/declaration?entity=${d.id}`}
                  className="flex items-center justify-between p-4 hover:bg-muted/40 transition"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{d.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Created {new Date(d.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-xs text-primary inline-flex items-center">
                    Open <ArrowRight className="w-3 h-3 ml-1" />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        {/* LEGAL */}
        <TabsContent value="legal" className="space-y-3">
          <LegalTab
            orgId={org.id}
            orgName={org.name}
            userId={user?.id ?? ""}
            canEdit={canEdit}
            canDelete={canAdmin}
            docs={legalDocs}
            reload={loadOpps}
          />
        </TabsContent>



        {/* MEMBERS */}
        <TabsContent value="members" className="space-y-3">
          {canAdmin && <InviteMemberRow orgId={org.id} onAdded={reloadMembers} />}
          <div className="rounded-xl border border-border bg-card divide-y divide-border">
            {members.map((m) => {
              const RoleIcon = ROLE_ICON[m.role];
              return (
                <div key={m.id} className="flex items-center justify-between p-4">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {m.profile?.full_name || m.user_id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-muted-foreground">Joined {new Date(m.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {canAdmin && m.user_id !== user?.id ? (
                      <Select
                        value={m.role}
                        onValueChange={async (newRole) => {
                          const { error } = await supabase
                            .from("organization_members")
                            .update({ role: newRole as OrgRole })
                            .eq("id", m.id);
                          if (error) toast({ title: "Update failed", description: error.message, variant: "destructive" });
                          else { toast({ title: "Role updated" }); reloadMembers(); }
                        }}
                      >
                        <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">Viewer</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge className={ROLE_COLOR[m.role]}>
                        <RoleIcon className="w-3 h-3 mr-1" /> {m.role}
                      </Badge>
                    )}
                    {canAdmin && m.user_id !== user?.id && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          if (!confirm("Remove this member?")) return;
                          const { error } = await supabase.from("organization_members").delete().eq("id", m.id);
                          if (error) toast({ title: "Remove failed", description: error.message, variant: "destructive" });
                          else { toast({ title: "Member removed" }); reloadMembers(); }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
        {/* DISTRIBUTION */}
        <TabsContent value="distribution" className="space-y-3">
          <OrgDistributionsTab orgId={org.id} orgName={org.name} canEdit={canEdit} />
        </TabsContent>


        {/* DAILY */}
        <TabsContent value="daily" className="space-y-3">
          <DailyTab orgId={org.id} canEdit={canEdit} tasks={dailyTasks} onTasksChange={saveDailyTasks} />
        </TabsContent>

        {/* PROJECT JOURNEY */}
        <TabsContent value="journey" className="space-y-3">
          <ProjectJourneyTab
            orgId={org.id}
            orgName={org.name}
            orgCreatedBy={org.created_by}
            sourceIdeaId={(org as any).source_idea_id ?? null}
          />
        </TabsContent>




      </Tabs>
    </div>
  );
}

function DailyTab({ orgId, canEdit, tasks, onTasksChange }: { orgId: string; canEdit: boolean; tasks: DailyTask[]; onTasksChange: (next: DailyTask[]) => void }) {
  const presKey = `org-daily-presentations:${orgId}`;
  const [presentations, setPresentations] = useState<DailyPresentation[]>([]);
  const [newTask, setNewTask] = useState("");
  const [presTitle, setPresTitle] = useState("");
  const [presUrl, setPresUrl] = useState("");

  useEffect(() => {
    try {
      setPresentations(JSON.parse(localStorage.getItem(presKey) || "[]"));
    } catch { /* ignore */ }
  }, [presKey]);

  const savePres = (next: DailyPresentation[]) => {
    setPresentations(next);
    localStorage.setItem(presKey, JSON.stringify(next));
  };

  const MAX_OPEN_TASKS = 4;
  const openCount = tasks.filter(t => !t.done).length;
  const atLimit = openCount >= MAX_OPEN_TASKS;

  const addTask = () => {
    const t = newTask.trim();
    if (!t) return;
    if (atLimit) return;
    onTasksChange([{ id: crypto.randomUUID(), text: t, done: false, created_at: new Date().toISOString() }, ...tasks]);
    setNewTask("");
  };
  const toggleTask = (id: string) => onTasksChange(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const removeTask = (id: string) => onTasksChange(tasks.filter(t => t.id !== id));

  const addPresentation = () => {
    const title = presTitle.trim();
    const url = presUrl.trim();
    if (!title || !url) return;
    try { new URL(url); } catch { return; }
    savePres([{ id: crypto.randomUUID(), title, url, created_at: new Date().toISOString() }, ...presentations]);
    setPresTitle("");
    setPresUrl("");
  };
  const removePresentation = (id: string) => savePres(presentations.filter(p => p.id !== id));

  const openTasks = tasks.filter(t => !t.done);
  const doneTasks = tasks.filter(t => t.done);

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* TASKS */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-primary" />
          <h3 className="font-semibold">Tasks to do</h3>
          <Badge variant="outline" className="ml-auto">{openTasks.length}/{MAX_OPEN_TASKS} open</Badge>
        </div>
        {canEdit && (
          <>
            <div className="flex gap-2">
              <Input
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder={atLimit ? "Limit reached — finish or delete one first" : "Add a task…"}
                disabled={atLimit}
                onKeyDown={(e) => e.key === "Enter" && addTask()}
              />
              <Button onClick={addTask} disabled={!newTask.trim() || atLimit}>
                <Plus className="w-3 h-3 mr-1" /> Add
              </Button>
            </div>
            {atLimit && (
              <p className="text-xs text-amber-600">
                You can't add more than {MAX_OPEN_TASKS} open tasks. Regroup them into one task or delete a task to free a slot.
              </p>
            )}
          </>
        )}
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No tasks yet.</p>
        ) : (
          <div className="space-y-1">
            {[...openTasks, ...doneTasks].map((t) => (
              <div key={t.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted/40 group">
                <button
                  onClick={() => canEdit && toggleTask(t.id)}
                  disabled={!canEdit}
                  className="shrink-0"
                  title={t.done ? "Mark as todo" : "Mark as done"}
                >
                  {t.done
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    : <Circle className="w-4 h-4 text-muted-foreground" />}
                </button>
                <span className={`text-sm flex-1 ${t.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                  {t.text}
                </span>
                {canEdit && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="opacity-0 group-hover:opacity-100 h-7 w-7 p-0"
                    onClick={() => removeTask(t.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PRESENTATIONS */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Presentation className="w-4 h-4 text-primary" />
          <h3 className="font-semibold">Presentations done</h3>
          <Badge variant="outline" className="ml-auto">{presentations.length}</Badge>
        </div>
        {canEdit && (
          <div className="space-y-2">
            <Input
              value={presTitle}
              onChange={(e) => setPresTitle(e.target.value)}
              placeholder="Title (e.g. Q1 kickoff)"
            />
            <div className="flex gap-2">
              <Input
                value={presUrl}
                onChange={(e) => setPresUrl(e.target.value)}
                placeholder="Google Docs / Slides link (https://…)"
                onKeyDown={(e) => e.key === "Enter" && addPresentation()}
              />
              <Button onClick={addPresentation} disabled={!presTitle.trim() || !presUrl.trim()}>
                <Plus className="w-3 h-3 mr-1" /> Add
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Paste a Google Docs/Slides share link. Anyone with view access on the doc can open it from here.
            </p>
          </div>
        )}
        {presentations.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No presentations linked yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {presentations.map((p) => (
              <div key={p.id} className="flex items-center gap-2 py-2 group">
                <div className="min-w-0 flex-1">
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-foreground hover:text-primary inline-flex items-center gap-1"
                  >
                    {p.title} <ExternalLink className="w-3 h-3" />
                  </a>
                  <p className="text-xs text-muted-foreground truncate">{p.url}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Added {new Date(p.created_at).toLocaleDateString()}
                  </p>
                </div>
                {canEdit && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="opacity-0 group-hover:opacity-100 h-7 w-7 p-0"
                    onClick={() => removePresentation(p.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, hint }: { icon: typeof Briefcase; title: string; hint: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border p-10 text-center">
      <Icon className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
      <p className="font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mt-1">{hint}</p>
    </div>
  );
}

function OppCard({
  title, description, status, scope, meta, href, canManage, canDelete, onDelete,
  interestedCount, onViewInterested,
}: {
  title: string; description: string; status: string; scope: string;
  meta: string[]; href: string; canManage: boolean; canDelete: boolean; onDelete: () => void;
  interestedCount?: number; onViewInterested?: () => void;
}) {
  const ScopeIcon = (SCOPE_ICON as any)[scope] ?? Globe;
  return (
    <div className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link to={href} className="font-semibold text-foreground hover:text-primary">{title}</Link>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{description}</p>
          <div className="flex items-center flex-wrap gap-2 mt-2 text-xs">
            <Badge variant={status === "published" ? "default" : "outline"} className="capitalize">{status}</Badge>
            <Badge variant="outline" className="capitalize"><ScopeIcon className="w-3 h-3 mr-1" />{scope}</Badge>
            {meta.map((m) => <span key={m} className="text-muted-foreground">· {m}</span>)}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {canManage && interestedCount !== undefined && onViewInterested && (
            <Button size="sm" variant="ghost" onClick={onViewInterested} title="View interested people">
              <Users className="w-4 h-4 mr-1" /> {interestedCount}
            </Button>
          )}
          {canDelete && (
            <Button size="sm" variant="ghost" onClick={onDelete}><Trash2 className="w-4 h-4" /></Button>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateOpportunityDialog({
  kind, orgId, userId, onCreated,
}: { kind: "job" | "tender"; orgId: string; userId: string; onCreated: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scope, setScope] = useState<"global" | "organization" | "private">("global");
  const [extra, setExtra] = useState<{ employment_type?: string; location?: string; budget_range?: string; deadline?: string }>({});
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!title.trim() || !description.trim()) return;
    setSaving(true);
    const base = {
      user_id: userId,
      created_by_user_id: userId,
      organization_id: orgId,
      visibility_scope: scope,
      title: title.trim(),
      description: description.trim(),
      status: "published",
    } as any;
    const payload = kind === "job"
      ? { ...base, employment_type: extra.employment_type || null, location: extra.location || null }
      : { ...base, budget_range: extra.budget_range || null, deadline: extra.deadline || null };
    const { error } = await supabase.from(kind === "job" ? "job_opportunities" : "tenders").insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: "Publish failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `${kind === "job" ? "Job" : "Tender"} published on behalf of organization` });
    setOpen(false);
    setTitle(""); setDescription(""); setExtra({}); setScope("global");
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="w-3 h-3 mr-1" /> New {kind}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Publish a {kind} for this organization</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} /></div>
          {kind === "job" ? (
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Employment type</Label><Input value={extra.employment_type ?? ""} onChange={(e) => setExtra({ ...extra, employment_type: e.target.value })} placeholder="Full-time" /></div>
              <div><Label>Location</Label><Input value={extra.location ?? ""} onChange={(e) => setExtra({ ...extra, location: e.target.value })} placeholder="Tunis / Remote" /></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Budget range</Label><Input value={extra.budget_range ?? ""} onChange={(e) => setExtra({ ...extra, budget_range: e.target.value })} placeholder="$10k–$25k" /></div>
              <div><Label>Deadline</Label><Input type="date" value={extra.deadline ?? ""} onChange={(e) => setExtra({ ...extra, deadline: e.target.value })} /></div>
            </div>
          )}
          <div>
            <Label>Visibility</Label>
            <Select value={scope} onValueChange={(v) => setScope(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="global">Global · marketplace + org page</SelectItem>
                <SelectItem value="organization">Organization · only members can see</SelectItem>
                <SelectItem value="private">Private · draft, not listed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !title.trim() || !description.trim()}>
            {saving ? "Publishing…" : "Publish"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InviteMemberRow({ orgId, onAdded }: { orgId: string; onAdded: () => void }) {
  const { toast } = useToast();
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<OrgRole>("viewer");
  const [saving, setSaving] = useState(false);

  const add = async () => {
    if (!userId.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("organization_members").insert({
      organization_id: orgId,
      user_id: userId.trim(),
      role,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Could not add member", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Member added" });
    setUserId("");
    onAdded();
  };

  return (
    <div className="rounded-xl border border-dashed border-border bg-card p-4 space-y-2">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">Add member by user id</p>
      <div className="flex gap-2 flex-wrap">
        <Input
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="User UUID"
          className="flex-1 min-w-[220px]"
        />
        <Select value={role} onValueChange={(v) => setRole(v as OrgRole)}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="viewer">Viewer</SelectItem>
            <SelectItem value="editor">Editor</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={add} disabled={saving || !userId.trim()}>Add</Button>
      </div>
      <p className="text-xs text-muted-foreground">Tip: find user IDs from the People directory or your members can share their profile.</p>
    </div>
  );
}

type LegalDoc = { id: string; name: string; storage_path: string; created_at: string; size_bytes: number | null };

function LegalTab({
  orgId, orgName, userId, canEdit, canDelete, docs, reload,
}: {
  orgId: string; orgName: string; userId: string;
  canEdit: boolean; canDelete: boolean;
  docs: LegalDoc[]; reload: () => void;
}) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [pdfTitle, setPdfTitle] = useState("");
  const [pdfBody, setPdfBody] = useState("");
  const [generating, setGenerating] = useState(false);

  const uploadFile = async (file: File, label?: string) => {
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast({ title: "Only PDF files are allowed", variant: "destructive" });
      return;
    }
    setUploading(true);
    const path = `${orgId}/${Date.now()}_${file.name.replace(/[^\w.\-]/g, "_")}`;
    const { error: upErr } = await supabase.storage
      .from("organization-legal")
      .upload(path, file, { contentType: "application/pdf", upsert: false });
    if (upErr) {
      setUploading(false);
      toast({ title: "Upload failed", description: upErr.message, variant: "destructive" });
      return;
    }
    const docName = label ? `${label} — ${file.name}` : file.name;
    const { error: dbErr } = await supabase.from("organization_legal_documents").insert({
      organization_id: orgId,
      name: docName,
      storage_path: path,
      mime_type: "application/pdf",
      size_bytes: file.size,
      uploaded_by: userId,
    });
    setUploading(false);
    if (dbErr) {
      toast({ title: "Save failed", description: dbErr.message, variant: "destructive" });
      return;
    }
    // If the certificate of incorporation was added, promote org type to "company"
    if (label === "Certificate of Incorporation") {
      const { error: typeErr } = await supabase
        .from("organizations")
        .update({ type: "company" })
        .eq("id", orgId);
      if (!typeErr) {
        toast({ title: "Certificate of Incorporation added", description: "This entity is now labeled as a Company." });
      } else {
        toast({ title: "Certificate saved", description: "Could not update the type label automatically." });
      }
    } else {
      toast({ title: `${label ?? "Legal document"} uploaded` });
    }
    reload();
  };


  const download = async (d: LegalDoc) => {
    const { data, error } = await supabase.storage
      .from("organization-legal")
      .createSignedUrl(d.storage_path, 60);
    if (error || !data?.signedUrl) {
      toast({ title: "Could not open file", description: error?.message, variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  };

  const remove = async (d: LegalDoc) => {
    if (!confirm(`Delete "${d.name}"?`)) return;
    await supabase.storage.from("organization-legal").remove([d.storage_path]);
    const { error } = await supabase.from("organization_legal_documents").delete().eq("id", d.id);
    if (error) { toast({ title: "Delete failed", description: error.message, variant: "destructive" }); return; }
    // If we just removed the last Certificate of Incorporation, downgrade the org type back to "organization"
    const wasCert = d.name.toLowerCase().startsWith("certificate of incorporation");
    const remainingCert = docs.some((x) => x.id !== d.id && x.name.toLowerCase().startsWith("certificate of incorporation"));
    if (wasCert && !remainingCert) {
      await supabase.from("organizations").update({ type: "organization" }).eq("id", orgId);
      toast({ title: "Deleted", description: "Entity is no longer labeled as Company." });
    } else {
      toast({ title: "Deleted" });
    }
    reload();
  };


  const generatePdf = async () => {
    if (!pdfTitle.trim() || !pdfBody.trim()) return;
    setGenerating(true);
    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const margin = 56;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const maxWidth = pageWidth - margin * 2;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(orgName, margin, margin);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Legal document · ${new Date().toLocaleDateString()}`, margin, margin + 16);
      doc.setDrawColor(180);
      doc.line(margin, margin + 26, pageWidth - margin, margin + 26);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(pdfTitle.trim(), margin, margin + 52);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      const lines = doc.splitTextToSize(pdfBody.trim(), maxWidth);
      let y = margin + 76;
      for (const line of lines) {
        if (y > pageHeight - margin) { doc.addPage(); y = margin; }
        doc.text(line, margin, y);
        y += 16;
      }

      const blob = doc.output("blob");
      const safe = pdfTitle.trim().replace(/[^\w.\-]+/g, "_").slice(0, 60) || "legal-document";
      const filename = `${safe}.pdf`;
      const file = new File([blob], filename, { type: "application/pdf" });
      await uploadFile(file);
      setCreateOpen(false);
      setPdfTitle(""); setPdfBody("");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-3">
      {canEdit && (() => {
        const LEGAL_CATEGORIES: { label: string; hint: string }[] = [
          { label: "Certificate of Incorporation", hint: "Promotes this entity to Company" },
          { label: "Statutes", hint: "Articles of association / bylaws" },
          { label: "Founders Agreement", hint: "Between co-founders" },
          { label: "NDA", hint: "Non-disclosure agreement" },
          { label: "Contract", hint: "Client / supplier / partnership" },
        ];
        const hasCert = docs.some((d) => d.name.toLowerCase().startsWith("certificate of incorporation"));
        return (
          <div className="rounded-xl border border-dashed border-border bg-card p-4 space-y-3">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <p className="text-sm font-medium text-foreground">Add legal documents</p>
                <p className="text-xs text-muted-foreground">PDF only. Upload one document per category.</p>
              </div>
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline"><FilePlus className="w-3 h-3 mr-1" /> Generate PDF from text</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create a legal PDF for {orgName}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label>Document title</Label>
                      <Input value={pdfTitle} onChange={(e) => setPdfTitle(e.target.value)} placeholder="Statutes / Founders agreement / NDA…" />
                    </div>
                    <div>
                      <Label>Content</Label>
                      <Textarea
                        value={pdfBody}
                        onChange={(e) => setPdfBody(e.target.value)}
                        rows={10}
                        placeholder="Type the legal clauses. Line breaks are preserved."
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                    <Button onClick={generatePdf} disabled={generating || !pdfTitle.trim() || !pdfBody.trim()}>
                      {generating ? "Generating…" : "Generate & save"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {!hasCert && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-500/10 p-2.5 text-xs text-amber-800 dark:text-amber-200">
                No <strong>Certificate of Incorporation</strong> yet — this entity is labeled <strong>Organization</strong>. Add it to be recognized as a <strong>Company</strong>.
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-2">
              {LEGAL_CATEGORIES.map((cat) => {
                const inputId = `legal-upload-${cat.label.replace(/\s+/g, "-").toLowerCase()}`;
                return (
                  <div key={cat.label} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background p-2.5">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">Add {cat.label}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{cat.hint}</p>
                    </div>
                    <input
                      id={inputId}
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f, cat.label); e.currentTarget.value = ""; }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={uploading}
                      onClick={() => document.getElementById(inputId)?.click()}
                    >
                      <Upload className="w-3 h-3 mr-1" /> PDF
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}


      {docs.length === 0 ? (
        <EmptyState
          icon={Scale}
          title="No legal documents yet"
          hint={canEdit ? "Upload a PDF or generate one from the buttons above." : "An editor needs to add one."}
        />
      ) : (
        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          {docs.map((d) => (
            <div key={d.id} className="flex items-center justify-between p-4 gap-3">
              <div className="min-w-0 flex items-start gap-3">
                <FileText className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{d.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(d.created_at).toLocaleDateString()}
                    {d.size_bytes ? ` · ${(d.size_bytes / 1024).toFixed(1)} KB` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button size="sm" variant="outline" onClick={() => download(d)}>
                  <Download className="w-3 h-3 mr-1" /> Open
                </Button>
                {canDelete && (
                  <Button size="icon" variant="ghost" onClick={() => remove(d)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OrgDistributionsTab({ orgId, orgName, canEdit }: { orgId: string; orgName: string; canEdit: boolean }) {
  const [entities, setEntities] = useState<DistEntity[]>([]);
  const [newName, setNewName] = useState("");

  const reload = useCallback(() => {
    setEntities(readDistEntities().filter((e) => e.orgId === orgId));
  }, [orgId]);

  useEffect(() => { reload(); }, [reload]);

  const create = () => {
    const name = newName.trim();
    if (!name) return;
    addDistEntity(name, orgId);
    setNewName("");
    reload();
  };

  const remove = (id: string) => {
    if (!confirm("Delete this distribution entity?")) return;
    writeDistEntities(readDistEntities().filter((e) => e.id !== id));
    reload();
  };

  return (
    <>
      {canEdit && (
        <div className="rounded-xl border border-dashed border-border bg-card p-4 flex gap-2 flex-wrap items-end">
          <div className="flex-1 min-w-[220px]">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">New distribution entity</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={`e.g. ${orgName} Q1 distribution`}
              onKeyDown={(e) => e.key === "Enter" && create()}
            />
          </div>
          <Button onClick={create} disabled={!newName.trim()}>
            <Plus className="w-3 h-3 mr-1" /> Add distribution
          </Button>
        </div>
      )}
      {entities.length === 0 ? (
        <EmptyState
          icon={PieChart}
          title="No distributions yet"
          hint={canEdit ? "Create one above. It will open in the full Distribution workspace." : "An editor needs to create one."}
        />
      ) : (
        <div className="rounded-xl border border-border bg-card divide-y divide-border">
          {entities.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between p-4 hover:bg-muted/40 transition cursor-pointer"
              onClick={() => window.location.href = `/distribution?entity=${d.id}`}
            >
              <div className="min-w-0">
                <p className="font-medium text-foreground truncate">{d.name}</p>
                <p className="text-xs text-muted-foreground">
                  Created {d.createdAt ? new Date(d.createdAt).toLocaleDateString() : "—"}
                </p>
              </div>
              <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                {canEdit && (
                  <button
                    onClick={() => remove(d.id)}
                    className="text-muted-foreground hover:text-destructive"
                    title="Delete"
                    aria-label="Delete distribution"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <Link to={`/distribution?entity=${d.id}`} className="text-xs text-primary inline-flex items-center">
                  Open <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}



type JourneyIdea = {
  id: string;
  title: string;
  current_episode: string;
  creator_id: string;
  review_status: string | null;
  status: string | null;
};

const EPISODE_META: Record<string, { label: string; className: string }> = {
  development: { label: "Development", className: "bg-blue-500/10 text-blue-700 border-blue-200" },
  validation:  { label: "Validation",  className: "bg-amber-500/10 text-amber-700 border-amber-200" },
  growth:      { label: "Growth",      className: "bg-emerald-500/10 text-emerald-700 border-emerald-200" },
};

function ProjectJourneyTab({
  orgId,
  orgName,
  orgCreatedBy,
  sourceIdeaId,
}: {
  orgId: string;
  orgName: string;
  orgCreatedBy: string;
  sourceIdeaId: string | null;
}) {
  const { user } = useAuth();
  const [idea, setIdea] = useState<JourneyIdea | null>(null);
  const [systematizedBrand, setSystematizedBrand] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);

      // 1) Try direct link via source_idea_id
      let found: JourneyIdea | null = null;
      if (sourceIdeaId) {
        const { data } = await supabase
          .from("startup_ideas")
          .select("id, title, current_episode, creator_id, review_status, status")
          .eq("id", sourceIdeaId)
          .maybeSingle();
        found = (data as JourneyIdea) ?? null;
      }

      // 2) Fallback: fuzzy match by title on ideas created by the org creator
      if (!found) {
        const { data } = await supabase
          .from("startup_ideas")
          .select("id, title, current_episode, creator_id, review_status, status")
          .eq("creator_id", orgCreatedBy);
        const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
        const target = norm(orgName);
        found =
          (data as JourneyIdea[] | null)?.find(
            (r) => norm(r.title) === target || norm(r.title).includes(target) || target.includes(norm(r.title)),
          ) ?? null;
      }

      // 3) Systematized detection: the org creator's profile brand name.
      //    Growth · Systematized surfaces the user's brand (profile.startup_name),
      //    so we consider the org "present" when that brand matches the org.
      const { data: prof } = await supabase
        .from("profiles")
        .select("startup_name")
        .eq("user_id", orgCreatedBy)
        .maybeSingle();
      const brand = (prof as any)?.startup_name ?? null;

      if (!cancelled) {
        setIdea(found);
        setSystematizedBrand(brand);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [sourceIdeaId, orgId, orgName, orgCreatedBy, user?.id]);

  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const brandMatches =
    !!systematizedBrand &&
    (norm(systematizedBrand) === norm(orgName) ||
      norm(systematizedBrand).includes(norm(orgName)) ||
      norm(orgName).includes(norm(systematizedBrand)));

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading project journey…</div>;
  }

  // Not linked to any startup idea AND not matching a systematized brand
  if (!idea && !brandMatches) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <Lightbulb className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium text-foreground">No startup linked to this organization</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            This organization is not yet present in the Entrepreneurship engine — neither in{" "}
            <span className="font-medium">Legacy</span> nor in{" "}
            <span className="font-medium">Growth · Systematized</span>.
            {systematizedBrand && (
              <> Your Systematized brand is <span className="font-medium">"{systematizedBrand}"</span>, which doesn't match <span className="font-medium">"{orgName}"</span>.</>
            )}
          </p>
          <Button asChild className="mt-4">
            <Link to="/entrepreneurship?tab=legacy&new=1">
              <Plus className="w-4 h-4 mr-1" /> Add startup
            </Link>
          </Button>
        </div>
        <ProductJourneySection orgId={orgId} userId={user?.id} />
      </div>
    );
  }

  // Case: no idea but brand matches → Systematized-only presence
  if (!idea && brandMatches) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-semibold text-foreground truncate">{systematizedBrand}</h3>
            <Badge variant="outline" className={EPISODE_META.growth.className}>Step: Growth</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Detected as your Systematized brand asset in the Entrepreneurship engine.
          </p>

          <div className="mt-4 grid sm:grid-cols-2 gap-3">
            <div className="rounded-lg border border-dashed border-border p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">Legacy</p>
                <Badge variant="outline" className="text-muted-foreground">
                  <Circle className="w-3 h-3 mr-1" /> Not present
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">No linked startup idea yet.</p>
              <Button asChild variant="link" size="sm" className="px-0 h-auto mt-1 text-xs">
                <Link to="/entrepreneurship?tab=legacy&new=1">Add as startup idea →</Link>
              </Button>
            </div>
            <div className="rounded-lg border border-primary/40 bg-primary/5 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">Growth · Systematized</p>
                <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-200" variant="outline">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Present
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Matches your brand "{systematizedBrand}".
              </p>
              <Button asChild variant="link" size="sm" className="px-0 h-auto mt-1 text-xs">
                <Link to="/entrepreneurship?tab=growth&growth=systematized">Open Systematized →</Link>
              </Button>
            </div>
          </div>
        </div>
        <ProductJourneySection orgId={orgId} userId={user?.id} />
      </div>
    );
  }


  const ep = (idea.current_episode || "development").toLowerCase();
  const epMeta = EPISODE_META[ep] ?? EPISODE_META.development;
  // Location: startup ideas are listed in the Legacy tab. Growth episode also
  // qualifies the venture for the Growth · Systematized track.
  // Legacy hosts Development/Validation ideas. Once a venture reaches Growth,
  // it graduates to the Growth · Systematized track and is no longer in Legacy.
  const inSystematized = ep === "growth" || brandMatches;
  const inLegacy = !inSystematized;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-semibold text-foreground truncate">{idea.title}</h3>
              <Badge variant="outline" className={epMeta.className}>
                Step: {epMeta.label}
              </Badge>
              {idea.review_status && (
                <Badge variant="secondary" className="capitalize text-xs">{idea.review_status}</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Linked startup idea from the Entrepreneurship engine.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to={`/opportunities/${idea.id}`}>
              <Eye className="w-3.5 h-3.5 mr-1" /> Open idea
            </Link>
          </Button>
        </div>

        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          <div className={`rounded-lg border p-3 ${inLegacy ? "border-primary/40 bg-primary/5" : "border-dashed border-border"}`}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">Legacy</p>
              {inLegacy ? (
                <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-200" variant="outline">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Present
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  <Circle className="w-3 h-3 mr-1" /> Not present
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Ventures you initiated, joined, or partnered on.
            </p>
            <Button asChild variant="link" size="sm" className="px-0 h-auto mt-1 text-xs">
              <Link to="/entrepreneurship?tab=legacy&sub=initiated">Open Legacy →</Link>
            </Button>
          </div>

          <div className={`rounded-lg border p-3 ${inSystematized ? "border-primary/40 bg-primary/5" : "border-dashed border-border"}`}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">Growth · Systematized</p>
              {inSystematized ? (
                <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-200" variant="outline">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Present
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  <Circle className="w-3 h-3 mr-1" /> Not yet
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Unlocks when the venture reaches the Growth step.
            </p>
            <Button asChild variant="link" size="sm" className="px-0 h-auto mt-1 text-xs">
              <Link to="/entrepreneurship?tab=growth&growth=systematized">Open Systematized →</Link>
            </Button>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs text-muted-foreground mb-2">Business Idea Journey steps</p>
          <div className="flex items-center gap-2 flex-wrap">
            {(["development", "validation", "growth"] as const).map((k, i) => {
              const meta = EPISODE_META[k];
              const active = k === ep;
              const reached =
                (ep === "validation" && i <= 1) ||
                (ep === "growth" && i <= 2) ||
                (ep === "development" && i === 0);
              return (
                <div
                  key={k}
                  className={`px-3 py-1.5 rounded-full text-xs border ${
                    active
                      ? meta.className + " font-semibold"
                      : reached
                      ? "bg-muted text-foreground border-border"
                      : "border-dashed border-border text-muted-foreground"
                  }`}
                >
                  {i + 1}. {meta.label}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <ProductJourneySection orgId={orgId} userId={user?.id} />
    </div>
  );
}

function ProductJourneySection({ orgId, userId }: { orgId: string; userId: string | undefined }) {
  const { toast } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [archived, setArchived] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingProduct, setAddingProduct] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [savingProduct, setSavingProduct] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: active }, { data: arch }] = await Promise.all([
      (supabase as any)
        .from("organization_products")
        .select("*")
        .eq("organization_id", orgId)
        .is("archived_at", null)
        .order("position", { ascending: true }),
      (supabase as any)
        .from("organization_products")
        .select("*")
        .eq("organization_id", orgId)
        .not("archived_at", "is", null)
        .order("archived_at", { ascending: false }),
    ]);
    setProducts((active as any[]) ?? []);
    setArchived((arch as any[]) ?? []);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  const addProduct = async () => {
    if (!userId) return;
    setSavingProduct(true);
    const nextPos = (products[products.length - 1]?.position ?? 0) + 1;
    const name = newProductName.trim() || `Product Journey (${nextPos})`;
    const { error } = await (supabase as any)
      .from("organization_products")
      .insert({ organization_id: orgId, name, position: nextPos, created_by: userId });
    setSavingProduct(false);
    if (error) {
      toast({ title: "Couldn't add product", description: error.message, variant: "destructive" });
      return;
    }
    setNewProductName("");
    setAddingProduct(false);
    load();
  };

  const archiveProduct = async (id: string) => {
    if (!confirm("Archive this product journey? You can restore it later from the Archived section.")) return;
    const { error } = await (supabase as any)
      .from("organization_products")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast({ title: "Couldn't archive", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Archived", description: "Restore anytime from the Archived section." });
    load();
  };

  const restoreProduct = async (id: string) => {
    const { error } = await (supabase as any)
      .from("organization_products")
      .update({ archived_at: null })
      .eq("id", id);
    if (error) {
      toast({ title: "Couldn't restore", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Restored" });
    load();
  };

  const deleteForever = async (id: string) => {
    if (!confirm("Permanently delete this product journey and all its iterations? This cannot be undone.")) return;
    const { error } = await (supabase as any)
      .from("organization_products")
      .delete()
      .eq("id", id);
    if (error) {
      toast({ title: "Couldn't delete", description: error.message, variant: "destructive" });
      return;
    }
    load();
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <Rocket className="w-4 h-4 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Product Journeys</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Track every product this entity ships. Each product has its own versioned case-study trail — v1 spreadsheet, v2 platform, v3 optimized…
          </p>
        </div>
        <Button size="sm" onClick={() => setAddingProduct((o) => !o)}>
          <Plus className="w-4 h-4 mr-1" /> {addingProduct ? "Cancel" : "Add product journey"}
        </Button>
      </div>

      {addingProduct && (
        <div className="mt-4 rounded-lg border border-border p-3 bg-background flex items-end gap-2 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <Label className="text-xs">Product name</Label>
            <Input
              value={newProductName}
              onChange={(e) => setNewProductName(e.target.value)}
              placeholder={`Product Journey (${(products[products.length - 1]?.position ?? 0) + 1})`}
            />
          </div>
          <Button size="sm" onClick={addProduct} disabled={savingProduct}>
            {savingProduct ? "Saving…" : "Create"}
          </Button>
        </div>
      )}

      <div className="mt-4 space-y-4">
        {loading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : products.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center">
            <Rocket className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No product journeys yet. Add one to start logging shipped iterations as case studies.</p>
          </div>
        ) : (
          products.map((p) => (
            <ProductBlock
              key={p.id}
              product={p}
              orgId={orgId}
              userId={userId}
              onRemove={() => archiveProduct(p.id)}
            />
          ))
        )}
      </div>

      {archived.length > 0 && (
        <div className="mt-6 border-t border-border pt-4">
          <button
            type="button"
            onClick={() => setShowArchived((s) => !s)}
            className="text-xs font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            <History className="w-3.5 h-3.5" />
            Archived ({archived.length}) {showArchived ? "▾" : "▸"}
          </button>
          {showArchived && (
            <ul className="mt-3 space-y-2">
              {archived.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-border bg-background/50 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm text-foreground truncate">{p.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Archived {new Date(p.archived_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => restoreProduct(p.id)}>
                      Restore
                    </Button>
                    {userId === p.created_by && (
                      <Button size="icon" variant="ghost" onClick={() => deleteForever(p.id)} title="Delete permanently">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}


function ProductBlock({
  product,
  orgId,
  userId,
  onRemove,
}: {
  product: any;
  orgId: string;
  userId: string | undefined;
  onRemove: () => void;
}) {
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(product.name);
  const [savingName, setSavingName] = useState(false);
  const [currentName, setCurrentName] = useState(product.name);
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({ title: "", description: "", implementation_type: "", url: "", shipped_at: "" });
  const [savingEdit, setSavingEdit] = useState(false);

  const startEdit = (it: any) => {
    setEditingId(it.id);
    setEditForm({
      title: it.title || "",
      description: it.description || "",
      implementation_type: it.implementation_type || "",
      url: it.url || "",
      shipped_at: it.shipped_at ? String(it.shipped_at).slice(0, 10) : "",
    });
  };

  const saveEdit = async (id: string) => {
    if (!editForm.title.trim()) return;
    setSavingEdit(true);
    const { error } = await (supabase as any)
      .from("organization_product_iterations")
      .update({
        title: editForm.title.trim(),
        description: editForm.description.trim() || null,
        implementation_type: editForm.implementation_type.trim() || null,
        url: editForm.url.trim() || null,
        shipped_at: editForm.shipped_at || null,
      })
      .eq("id", id);
    setSavingEdit(false);
    if (error) {
      toast({ title: "Couldn't update", description: error.message, variant: "destructive" });
      return;
    }
    setEditingId(null);
    load();
  };
  const [form, setForm] = useState({
    title: "",
    description: "",
    implementation_type: "",
    url: "",
    shipped_at: "",
  });

  useEffect(() => {
    setCurrentName(product.name);
    setNameDraft(product.name);
  }, [product.name]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("organization_product_iterations")
      .select("*")
      .eq("product_id", product.id)
      .is("archived_at", null)
      .order("version_number", { ascending: true });
    setItems((data as any[]) ?? []);
    setLoading(false);
  }, [product.id]);

  const loadHistory = useCallback(async () => {
    const { data } = await (supabase as any)
      .from("organization_product_name_history")
      .select("*")
      .eq("product_id", product.id)
      .order("changed_at", { ascending: false });
    setHistory((data as any[]) ?? []);
  }, [product.id]);

  useEffect(() => { load(); loadHistory(); }, [load, loadHistory]);

  const reset = () => setForm({ title: "", description: "", implementation_type: "", url: "", shipped_at: "" });

  const saveName = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === currentName || !userId) {
      setEditingName(false);
      setNameDraft(currentName);
      return;
    }
    setSavingName(true);
    const previous = currentName;
    const { error } = await (supabase as any)
      .from("organization_products")
      .update({ name: trimmed })
      .eq("id", product.id);
    if (error) {
      setSavingName(false);
      toast({ title: "Couldn't rename", description: error.message, variant: "destructive" });
      return;
    }
    await (supabase as any)
      .from("organization_product_name_history")
      .insert({
        product_id: product.id,
        organization_id: orgId,
        previous_name: previous,
        new_name: trimmed,
        changed_by: userId,
      });
    setCurrentName(trimmed);
    setEditingName(false);
    setSavingName(false);
    toast({ title: "Renamed", description: `Previous name kept in history.` });
    loadHistory();
  };

  const submit = async () => {
    if (!userId || !form.title.trim()) return;
    setSaving(true);
    const nextVersion = (items[items.length - 1]?.version_number ?? 0) + 1;
    const { error } = await (supabase as any)
      .from("organization_product_iterations")
      .insert({
        organization_id: orgId,
        product_id: product.id,
        version_number: nextVersion,
        title: form.title.trim(),
        description: form.description.trim() || null,
        implementation_type: form.implementation_type.trim() || null,
        url: form.url.trim() || null,
        shipped_at: form.shipped_at || null,
        created_by: userId,
      });
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't add iteration", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `v${nextVersion} added` });
    reset();
    setOpen(false);
    load();
  };

  const removeIteration = async (id: string) => {
    const { error } = await (supabase as any)
      .from("organization_product_iterations")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast({ title: "Couldn't remove", description: error.message, variant: "destructive" });
      return;
    }
    load();
  };

  const canEdit = userId === product.created_by;

  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          {editingName ? (
            <div className="flex items-center gap-2 flex-wrap">
              <Input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveName();
                  if (e.key === "Escape") { setEditingName(false); setNameDraft(currentName); }
                }}
                autoFocus
                className="h-8 max-w-xs"
              />
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={saveName} disabled={savingName} title="Save">
                <Check className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditingName(false); setNameDraft(currentName); }} title="Cancel">
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold text-foreground">{currentName}</h4>
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowHistory((s) => !s)}
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground rounded-full border border-border px-2 py-0.5"
                  title="View name history"
                >
                  <History className="w-3 h-3" />
                  {history.length} rename{history.length === 1 ? "" : "s"}
                </button>
              )}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">
            {items.length} shipped iteration{items.length === 1 ? "" : "s"}
          </p>
          {showHistory && history.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground border-l border-border pl-3">
              {history.map((h) => (
                <li key={h.id}>
                  <span className="line-through">{h.previous_name}</span>
                  {" → "}
                  <span className="text-foreground">{h.new_name}</span>
                  <span className="ml-2 opacity-70">{new Date(h.changed_at).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => { if (collapsed) setCollapsed(false); setOpen((o) => !o); }}>
            <Plus className="w-4 h-4 mr-1" /> {open ? "Cancel" : "Add iteration"}
          </Button>
          {canEdit && !editingName && (
            <Button variant="ghost" size="icon" onClick={() => setEditingName(true)} title="Rename product journey">
              <Pencil className="w-4 h-4" />
            </Button>
          )}
          {canEdit && (
            <Button variant="ghost" size="icon" onClick={onRemove} title="Remove product journey">
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => setCollapsed((c) => !c)} title={collapsed ? "Expand product journey" : "Collapse product journey"}>
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </div>


      {!collapsed && (
        <>
          {open && (
            <div className="mt-3 rounded-lg border border-border p-3 space-y-2 bg-card">
              <div className="grid sm:grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Title *</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Client tracker MVP" />
                </div>
                <div>
                  <Label className="text-xs">Implementation type</Label>
                  <Input value={form.implementation_type} onChange={(e) => setForm({ ...form, implementation_type: e.target.value })} placeholder="Google Sheet · Platform · Optimized…" />
                </div>
                <div>
                  <Label className="text-xs">URL or reference</Label>
                  <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://…" />
                </div>
                <div>
                  <Label className="text-xs">Shipped on</Label>
                  <Input type="date" value={form.shipped_at} onChange={(e) => setForm({ ...form, shipped_at: e.target.value })} />
                </div>
              </div>
              <div>
                <Label className="text-xs">Case study — what you implemented and results</Label>
                <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Context, what you shipped, who it served, outcomes…" />
              </div>
              <div className="flex justify-end">
                <Button size="sm" onClick={submit} disabled={saving || !form.title.trim()}>
                  {saving ? "Saving…" : "Save iteration"}
                </Button>
              </div>
            </div>
          )}

          <div className="mt-3">
            {loading ? (
              <p className="text-xs text-muted-foreground">Loading…</p>
            ) : items.length === 0 ? (
              <p className="text-xs text-muted-foreground">No shipped iterations yet.</p>
            ) : (
              <ol className="relative border-l border-border ml-3 space-y-4">
                {items.map((it) => (
                  <li key={it.id} className="ml-4">
                    <span className="absolute -left-[11px] flex h-5 w-5 items-center justify-center rounded-full border-2 border-primary bg-background text-[10px] font-semibold text-primary">
                      {it.version_number}
                    </span>
                    <div className="rounded-lg border border-border p-3">
                      {editingId === it.id ? (
                        <div className="space-y-2">
                          <div className="grid sm:grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs">Title *</Label>
                              <Input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
                            </div>
                            <div>
                              <Label className="text-xs">Implementation type</Label>
                              <Input value={editForm.implementation_type} onChange={(e) => setEditForm({ ...editForm, implementation_type: e.target.value })} />
                            </div>
                            <div>
                              <Label className="text-xs">URL or reference</Label>
                              <Input value={editForm.url} onChange={(e) => setEditForm({ ...editForm, url: e.target.value })} />
                            </div>
                            <div>
                              <Label className="text-xs">Shipped on</Label>
                              <Input type="date" value={editForm.shipped_at} onChange={(e) => setEditForm({ ...editForm, shipped_at: e.target.value })} />
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs">Case study</Label>
                            <Textarea rows={3} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                            <Button size="sm" onClick={() => saveEdit(it.id)} disabled={savingEdit || !editForm.title.trim()}>
                              {savingEdit ? "Saving…" : "Save changes"}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-foreground">v{it.version_number} · {it.title}</p>
                              {it.implementation_type && (
                                <Badge variant="outline" className="text-xs">{it.implementation_type}</Badge>
                              )}
                              {it.shipped_at && (
                                <span className="text-xs text-muted-foreground">{new Date(it.shipped_at).toLocaleDateString()}</span>
                              )}
                            </div>
                            {it.description && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{it.description}</p>}
                            {it.url && (
                              <a href={it.url} target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-1 mt-1">
                                <ExternalLink className="w-3 h-3" /> {it.url}
                              </a>
                            )}
                          </div>
                          {userId === it.created_by && (
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" onClick={() => startEdit(it)} title="Edit iteration">
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => removeIteration(it.id)} title="Remove iteration">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------- Tender workflow rows ----------------

const INTEREST_STATUS_META: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-amber-500/10 text-amber-700 border-amber-500/30" },
  accepted: { label: "Accepted", className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" },
  refused: { label: "Refused", className: "bg-destructive/10 text-destructive border-destructive/30" },
};

function InterestRow({
  interest,
  onUpdate,
}: {
  interest: { interaction_id: string; user_id: string; full_name: string | null; message: string | null; status: string; created_at: string };
  onUpdate: () => void;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const meta = INTEREST_STATUS_META[interest.status] ?? INTEREST_STATUS_META.pending;

  const update = async (nextStatus: "accepted" | "refused") => {
    setBusy(true);
    const { error } = await supabase
      .from("opportunity_interactions")
      .update({ status: nextStatus, reviewed_at: new Date().toISOString() })
      .eq("id", interest.interaction_id);
    setBusy(false);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: nextStatus === "accepted" ? "Candidate accepted" : "Candidate refused" });
    onUpdate();
  };

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-sm truncate">{interest.full_name ?? "Unknown"}</span>
          <Badge variant="outline" className={`text-xs ${meta.className}`}>{meta.label}</Badge>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <a
            href={`https://box4solutions.com/u/${interest.user_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex"
          >
            <Button size="sm" variant="ghost" title="View public profile">
              <Eye className="w-3.5 h-3.5" />
            </Button>
          </a>
          {interest.status !== "accepted" && (
            <Button size="sm" variant="ghost" onClick={() => update("accepted")} disabled={busy} title="Accept">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            </Button>
          )}
          {interest.status !== "refused" && (
            <Button size="sm" variant="ghost" onClick={() => update("refused")} disabled={busy} title="Refuse">
              <X className="w-3.5 h-3.5 text-destructive" />
            </Button>
          )}
        </div>
      </div>
      {interest.message && <p className="text-sm text-muted-foreground mt-2">{interest.message}</p>}
      <div className="text-xs text-muted-foreground mt-1">{new Date(interest.created_at).toLocaleDateString()}</div>
    </div>
  );
}

const SUB_STATUS_META: Record<string, { label: string; className: string }> = {
  submitted: { label: "Submitted", className: "bg-amber-500/10 text-amber-700 border-amber-500/30" },
  approved: { label: "Approved", className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" },
  changes_requested: { label: "Changes requested", className: "bg-orange-500/10 text-orange-700 border-orange-500/30" },
  paid: { label: "Paid", className: "bg-primary/10 text-primary border-primary/30" },
  rejected: { label: "Rejected", className: "bg-destructive/10 text-destructive border-destructive/30" },
};

function SubmissionRow({
  submission,
  onUpdate,
}: {
  submission: {
    id: string; tender_id: string; user_id: string; user_name: string | null;
    note: string | null; file_path: string | null; file_name: string | null; link_url?: string | null;
    status: string; reviewer_notes: string | null; paid_at: string | null; created_at: string;
  };
  onUpdate: () => void;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const meta = SUB_STATUS_META[submission.status] ?? SUB_STATUS_META.submitted;

  const setStatus = async (patch: Record<string, unknown>) => {
    setBusy(true);
    const { error } = await supabase.from("tender_submissions").update({ ...patch, reviewed_at: new Date().toISOString() }).eq("id", submission.id);
    setBusy(false);
    if (error) { toast({ title: "Update failed", description: error.message, variant: "destructive" }); return; }
    onUpdate();
  };

  const download = async () => {
    if (!submission.file_path) return;
    const { data, error } = await supabase.storage.from("tender-submissions").createSignedUrl(submission.file_path, 60);
    if (error || !data) { toast({ title: "Download failed", variant: "destructive" }); return; }
    window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="rounded-lg border border-border p-3 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-sm truncate">{submission.user_name ?? "Unknown"}</span>
          <Badge variant="outline" className={`text-xs ${meta.className}`}>{meta.label}</Badge>
          {submission.paid_at && <span className="text-xs text-primary">Paid {new Date(submission.paid_at).toLocaleDateString()}</span>}
        </div>
        <a href={`https://box4solutions.com/u/${submission.user_id}`} target="_blank" rel="noopener noreferrer">
          <Button size="sm" variant="ghost" title="View public profile"><Eye className="w-3.5 h-3.5" /></Button>
        </a>
      </div>
      {submission.note && <p className="text-sm text-muted-foreground">{submission.note}</p>}
      {submission.file_name && (
        <Button size="sm" variant="ghost" onClick={download}>
          <FileText className="w-3 h-3 mr-1" /> {submission.file_name}
        </Button>
      )}
      {submission.link_url && (
        <a href={submission.link_url} target="_blank" rel="noopener noreferrer"
           className="inline-flex items-center gap-1 text-xs text-primary hover:underline break-all">
          <ExternalLink className="w-3 h-3" /> {submission.link_url}
        </a>
      )}
      {submission.reviewer_notes && (
        <div className="rounded-md bg-muted/50 p-2 text-xs">
          <span className="font-medium">Feedback:</span> {submission.reviewer_notes}
        </div>
      )}

      {showFeedback && (
        <div className="space-y-2">
          <Textarea rows={2} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="What needs to change?" />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => { setStatus({ status: "changes_requested", reviewer_notes: feedback.trim() || null }); setShowFeedback(false); setFeedback(""); }} disabled={busy}>
              Send feedback
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowFeedback(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {!showFeedback && (
        <div className="flex flex-wrap gap-1">
          {submission.status === "submitted" && (
            <>
              <Button size="sm" variant="outline" onClick={() => setStatus({ status: "approved" })} disabled={busy}>
                <Check className="w-3 h-3 mr-1" /> Approve
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowFeedback(true)} disabled={busy}>
                <RefreshCw className="w-3 h-3 mr-1" /> Request changes
              </Button>
            </>
          )}
          {submission.status === "approved" && !submission.paid_at && (
            <Button size="sm" onClick={() => setStatus({ status: "paid", paid_at: new Date().toISOString() })} disabled={busy}>
              <DollarSign className="w-3 h-3 mr-1" /> Mark as paid
            </Button>
          )}
        </div>
      )}
      <div className="text-xs text-muted-foreground">{new Date(submission.created_at).toLocaleString()}</div>
    </div>
  );
}
