import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useMyOrganizations } from "@/hooks/useOrganizations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Building2, Plus, Shield, Eye, Pencil, ArrowRight, Trash2 } from "lucide-react";

const slugify = (s: string) =>
  s.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

const ROLE_ICON = { admin: Shield, editor: Pencil, viewer: Eye } as const;
const ROLE_COLOR = {
  admin: "bg-primary/10 text-primary",
  editor: "bg-amber-500/10 text-amber-600",
  viewer: "bg-muted text-muted-foreground",
} as const;

export default function Organizations() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { memberships, loading, reload } = useMyOrganizations(user?.id);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [type, setType] = useState("company");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [saving, setSaving] = useState(false);

  const create = async () => {
    if (!user || !name.trim()) return;
    setSaving(true);
    const finalSlug = (slug || slugify(name)).trim();
    const { error } = await supabase.from("organizations").insert({
      slug: finalSlug,
      name: name.trim(),
      type,
      description: description.trim() || null,
      website: website.trim() || null,
      created_by: user.id,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Could not create organization", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `Organization "${name}" created` });
    setOpen(false);
    setName(""); setSlug(""); setDescription(""); setWebsite("");
    await reload();
  };

  return (
    <div className="container mx-auto px-4 pt-24 pb-8 max-w-5xl space-y-6">
      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div className="flex-1 min-w-[260px]">
          <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
          <p className="text-muted-foreground mt-1">
            Organizations own opportunities and group team members with roles (admin · editor · viewer).
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-1" /> New organization</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create an organization</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Name</Label>
                <Input
                  value={name}
                  onChange={(e) => { setName(e.target.value); if (!slug) setSlug(slugify(e.target.value)); }}
                  placeholder="Elspace"
                />
              </div>
              <div>
                <Label>Slug</Label>
                <Input value={slug} onChange={(e) => setSlug(slugify(e.target.value))} placeholder="elspace" />
                <p className="text-xs text-muted-foreground mt-1">Used in URLs: /org/{slug || "your-slug"}</p>
              </div>
              <div>
                <Label>Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company">Company</SelectItem>
                    <SelectItem value="ministry">Ministry</SelectItem>
                    <SelectItem value="ngo">NGO</SelectItem>
                    <SelectItem value="startup">Startup</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Website (optional)</Label>
                <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://elspace.io" />
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={create} disabled={saving || !name.trim()}>
                {saving ? "Creating…" : "Create organization"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : memberships.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <Building2 className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium text-foreground">You don't belong to any organization yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Create one above. As the creator you'll automatically be admin.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {memberships.map(({ organization: o, role }) => {
            const RoleIcon = ROLE_ICON[role];
            return (
              <Link
                key={o.id}
                to={`/org/${o.slug}`}
                className="rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-sm transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{o.name}</h3>
                    <p className="text-xs text-muted-foreground capitalize">{o.type}</p>
                  </div>
                  <Badge className={ROLE_COLOR[role]}>
                    <RoleIcon className="w-3 h-3 mr-1" /> {role}
                  </Badge>
                </div>
                {o.description && (
                  <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{o.description}</p>
                )}
                <div className="flex items-center justify-end mt-4 text-xs text-primary">
                  Open <ArrowRight className="w-3 h-3 ml-1" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
