// Organization detail page — /org/:slug
// Tabs: Overview / Jobs / Tenders / Members
// Editor+ can publish jobs and tenders on behalf of the organization.
// Viewer can browse but not edit.

import { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  useOrganizationBySlug,
  useMyOrgRole,
  useOrgMembers,
  roleAtLeast,
  type OrgRole,
} from "@/hooks/useOrganizations";
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

export default function OrganizationPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { org, loading } = useOrganizationBySlug(slug);
  const role = useMyOrgRole(user?.id, org?.id);
  const canEdit = roleAtLeast(role, "editor");
  const canAdmin = roleAtLeast(role, "admin");

  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [tenders, setTenders] = useState<TenderRow[]>([]);
  const [declarations, setDeclarations] = useState<{ id: string; name: string; created_at: string }[]>([]);
  const [legalDocs, setLegalDocs] = useState<{ id: string; name: string; storage_path: string; created_at: string; size_bytes: number | null }[]>([]);
  const [newDeclName, setNewDeclName] = useState("");
  const [creatingDecl, setCreatingDecl] = useState(false);
  const { members, reload: reloadMembers } = useOrgMembers(org?.id);

  const loadOpps = useCallback(async () => {
    if (!org) return;
    const [{ data: js }, { data: ts }, { data: ds }, { data: lg }] = await Promise.all([
      supabase.from("job_opportunities").select("*").eq("organization_id", org.id).order("created_at", { ascending: false }),
      supabase.from("tenders").select("*").eq("organization_id", org.id).order("created_at", { ascending: false }),
      supabase.from("declaration_entities").select("id, name, created_at").eq("organization_id", org.id).order("created_at", { ascending: true }),
      supabase.from("organization_legal_documents").select("id, name, storage_path, created_at, size_bytes").eq("organization_id", org.id).order("created_at", { ascending: false }),
    ]);
    setJobs((js as JobRow[]) ?? []);
    setTenders((ts as TenderRow[]) ?? []);
    setDeclarations((ds as any) ?? []);
    setLegalDocs((lg as any) ?? []);
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
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
      <Link to="/organizations" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-3 h-3 mr-1" /> All organizations
      </Link>

      {/* Header */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Building2 className="w-7 h-7 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{org.name}</h1>
              <Badge variant="outline" className="capitalize">{org.type}</Badge>
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

      <Tabs defaultValue="jobs" className="space-y-4">
        <TabsList className="flex-wrap h-auto justify-start">
          <TabsTrigger value="jobs"><Briefcase className="w-3 h-3 mr-1" /> Jobs ({jobs.length})</TabsTrigger>
          <TabsTrigger value="tenders"><FileText className="w-3 h-3 mr-1" /> Tenders ({tenders.length})</TabsTrigger>
          <TabsTrigger value="declaration"><ClipboardList className="w-3 h-3 mr-1" /> Declaration ({declarations.length})</TabsTrigger>
          <TabsTrigger value="distribution"><PieChart className="w-3 h-3 mr-1" /> Distribution</TabsTrigger>
          <TabsTrigger value="legal"><Scale className="w-3 h-3 mr-1" /> Legal ({legalDocs.length})</TabsTrigger>
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
              />
            ))
          )}
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


      </Tabs>
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
}: {
  title: string; description: string; status: string; scope: string;
  meta: string[]; href: string; canManage: boolean; canDelete: boolean; onDelete: () => void;
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
        {canDelete && (
          <Button size="sm" variant="ghost" onClick={onDelete}><Trash2 className="w-4 h-4" /></Button>
        )}
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
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Deleted" }); reload(); }
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
      {canEdit && (
        <div className="rounded-xl border border-dashed border-border bg-card p-4 flex flex-wrap gap-2 items-center">
          <input
            id="legal-upload"
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.currentTarget.value = ""; }}
          />
          <Button
            size="sm"
            variant="outline"
            disabled={uploading}
            onClick={() => document.getElementById("legal-upload")?.click()}
          >
            <Upload className="w-3 h-3 mr-1" /> {uploading ? "Uploading…" : "Upload PDF"}
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><FilePlus className="w-3 h-3 mr-1" /> Create PDF</Button>
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
          <span className="text-xs text-muted-foreground">Store statutes, founders agreements, NDAs, contracts — PDF only.</span>
        </div>
      )}

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


