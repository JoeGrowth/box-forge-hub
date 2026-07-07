import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, ExternalLink, UserPlus, Users, Trash2 } from "lucide-react";

interface Box {
  id: string;
  slug: string;
  name: string;
  domain: string | null;
  description: string | null;
}

interface Assignment {
  user_id: string;
  full_name?: string | null;
  avatar_url?: string | null;
}

export function AdminBoxesTab() {
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState<Record<string, Assignment[]>>({});
  const [advisors, setAdvisors] = useState<Record<string, Assignment[]>>({});

  const [createOpen, setCreateOpen] = useState(false);
  const [newBox, setNewBox] = useState({ name: "", slug: "", domain: "", description: "" });

  const [assignFor, setAssignFor] = useState<Box | null>(null);
  const [assignEmail, setAssignEmail] = useState("");

  const load = async () => {
    setLoading(true);
    const { data: bx } = await supabase.from("boxes").select("*").order("name");
    const boxList = (bx || []) as Box[];
    setBoxes(boxList);

    const ids = boxList.map((b) => b.id);
    if (ids.length) {
      const [{ data: ea }, { data: adv }] = await Promise.all([
        supabase.from("box_ecosystem_admins").select("box_id,user_id").in("box_id", ids),
        supabase.from("box_advisors").select("box_id,user_id,status").in("box_id", ids).eq("status", "active"),
      ]);
      const userIds = Array.from(new Set([...(ea || []).map((r: any) => r.user_id), ...(adv || []).map((r: any) => r.user_id)]));
      const { data: profs } = userIds.length
        ? await supabase.from("profiles").select("user_id,full_name,avatar_url").in("user_id", userIds)
        : { data: [] as any[] };
      const pmap = new Map((profs || []).map((p: any) => [p.user_id, p]));

      const aMap: Record<string, Assignment[]> = {};
      const vMap: Record<string, Assignment[]> = {};
      (ea || []).forEach((r: any) => {
        const p: any = pmap.get(r.user_id) || {};
        (aMap[r.box_id] ||= []).push({ user_id: r.user_id, full_name: p.full_name, avatar_url: p.avatar_url });
      });
      (adv || []).forEach((r: any) => {
        const p: any = pmap.get(r.user_id) || {};
        (vMap[r.box_id] ||= []).push({ user_id: r.user_id, full_name: p.full_name, avatar_url: p.avatar_url });
      });
      setAdmins(aMap);
      setAdvisors(vMap);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    if (!newBox.name || !newBox.slug) {
      toast.error("Name and slug required");
      return;
    }
    const { error } = await supabase.from("boxes").insert({
      name: newBox.name,
      slug: newBox.slug,
      domain: newBox.domain || null,
      description: newBox.description || null,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Box created");
    setCreateOpen(false);
    setNewBox({ name: "", slug: "", domain: "", description: "" });
    load();
  };

  const handleAssignAdmin = async () => {
    if (!assignFor || !assignEmail) return;
    const { data: prof } = await (supabase.from("profiles") as any).select("id").eq("email", assignEmail.trim()).maybeSingle();
    if (!prof) {
      toast.error("No user found with that email");
      return;
    }
    const { error } = await supabase.from("box_ecosystem_admins").insert({
      box_id: assignFor.id,
      user_id: prof.id,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Box admin assigned");
    setAssignEmail("");
    setAssignFor(null);
    load();
  };

  const removeAdmin = async (boxId: string, userId: string) => {
    const { error } = await supabase.from("box_ecosystem_admins").delete().eq("box_id", boxId).eq("user_id", userId);
    if (error) return toast.error(error.message);
    toast.success("Removed");
    load();
  };

  if (loading) return <div className="text-muted-foreground">Loading boxes...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Boxes</h2>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" />New Box</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Box</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={newBox.name} onChange={(e) => setNewBox({ ...newBox, name: e.target.value })} /></div>
              <div><Label>Slug</Label><Input value={newBox.slug} onChange={(e) => setNewBox({ ...newBox, slug: e.target.value })} placeholder="b4health" /></div>
              <div><Label>Domain</Label><Input value={newBox.domain} onChange={(e) => setNewBox({ ...newBox, domain: e.target.value })} placeholder="Health, Fintech..." /></div>
              <div><Label>Description</Label><Textarea value={newBox.description} onChange={(e) => setNewBox({ ...newBox, description: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={handleCreate}>Create</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {boxes.map((b) => (
          <div key={b.id} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">{b.name}</h3>
                  <Badge variant="outline">{b.slug}</Badge>
                  {b.domain && <Badge variant="secondary">{b.domain}</Badge>}
                </div>
                {b.description && <p className="text-sm text-muted-foreground mt-1">{b.description}</p>}
              </div>
              <div className="flex gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link to={`/boxes/${b.id}`}><ExternalLink className="h-4 w-4 mr-1" />Preview</Link>
                </Button>
                <Button size="sm" variant="outline" onClick={() => setAssignFor(b)}>
                  <UserPlus className="h-4 w-4 mr-1" />Assign Box Admin
                </Button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mt-4">
              <div>
                <div className="text-xs font-medium text-muted-foreground uppercase mb-2 flex items-center gap-1"><Users className="h-3 w-3" />Box Admins</div>
                {(admins[b.id] || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No admins assigned</p>
                ) : (
                  <ul className="space-y-1">
                    {admins[b.id].map((a) => (
                      <li key={a.user_id} className="flex items-center justify-between text-sm bg-muted/40 rounded px-2 py-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar className="h-6 w-6"><AvatarImage src={a.avatar_url || undefined} /><AvatarFallback>{(a.full_name || "U").charAt(0).toUpperCase()}</AvatarFallback></Avatar>
                          <span className="truncate">{a.full_name || "Unknown user"}</span>
                        </div>
                        <button onClick={() => removeAdmin(b.id, a.user_id)} className="text-destructive hover:opacity-70"><Trash2 className="h-3 w-3" /></button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground uppercase mb-2 flex items-center gap-1"><Users className="h-3 w-3" />Advisors Linked</div>
                {(advisors[b.id] || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No advisors linked</p>
                ) : (
                  <ul className="space-y-1">
                    {advisors[b.id].map((a) => (
                      <li key={a.user_id} className="flex items-center gap-2 text-sm bg-muted/40 rounded px-2 py-1">
                        <Avatar className="h-6 w-6"><AvatarImage src={a.avatar_url || undefined} /><AvatarFallback>{(a.full_name || "U").charAt(0).toUpperCase()}</AvatarFallback></Avatar>
                        <span className="truncate">{a.full_name || "Unknown user"}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        ))}
        {boxes.length === 0 && <p className="text-muted-foreground">No boxes yet. Create one to get started.</p>}
      </div>

      <Dialog open={!!assignFor} onOpenChange={(o) => !o && setAssignFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Box Admin — {assignFor?.name}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>User email</Label>
            <Input value={assignEmail} onChange={(e) => setAssignEmail(e.target.value)} placeholder="user@example.com" />
          </div>
          <DialogFooter><Button onClick={handleAssignAdmin}>Assign</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
