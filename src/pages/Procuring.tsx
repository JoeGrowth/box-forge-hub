import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, FileText, ShieldOff, Trash2 } from "lucide-react";

type Tender = {
  id: string;
  title: string;
  description: string;
  sector: string | null;
  budget_range: string | null;
  deadline: string | null;
  location: string | null;
  requirements: string | null;
  contact_info: string | null;
  status: string;
  created_at: string;
};

const Procuring = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    sector: "",
    budget_range: "",
    deadline: "",
    location: "",
    requirements: "",
    contact_info: "",
  });

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [accessRes, tendersRes] = await Promise.all([
        supabase
          .from("onboarding_state")
          .select("procuring_access" as any)
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("tenders" as any)
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);
      setHasAccess(!!(accessRes.data as any)?.procuring_access);
      setTenders(((tendersRes.data as any) || []) as Tender[]);
      setLoading(false);
    };
    load();
  }, [user]);

  const handleSubmit = async () => {
    if (!user) return;
    if (!form.title.trim() || !form.description.trim()) {
      toast.error("Title and description are required.");
      return;
    }
    setSubmitting(true);
    const { data, error } = await (supabase.from("tenders" as any) as any)
      .insert({
        user_id: user.id,
        title: form.title.trim(),
        description: form.description.trim(),
        sector: form.sector.trim() || null,
        budget_range: form.budget_range.trim() || null,
        deadline: form.deadline || null,
        location: form.location.trim() || null,
        requirements: form.requirements.trim() || null,
        contact_info: form.contact_info.trim() || null,
        status: "published",
      })
      .select()
      .single();
    setSubmitting(false);
    if (error) {
      toast.error(error.message || "Failed to publish tender.");
      return;
    }
    toast.success("Tender published.");
    setTenders((prev) => [data as Tender, ...prev]);
    setDialogOpen(false);
    setForm({
      title: "",
      description: "",
      sector: "",
      budget_range: "",
      deadline: "",
      location: "",
      requirements: "",
      contact_info: "",
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this tender?")) return;
    const { error } = await supabase.from("tenders" as any).delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete.");
      return;
    }
    setTenders((prev) => prev.filter((t) => t.id !== id));
    toast.success("Tender deleted.");
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageTransition>
        <main className="container mx-auto px-4 pt-24 pb-16 max-w-5xl">
          <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground mb-1">Procuring</h1>
              <p className="text-muted-foreground">
                Publish tenders that appear in the Opportunities marketplace.
              </p>
            </div>
            {hasAccess && (
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" /> Post Tender
              </Button>
            )}
          </div>

          {!hasAccess ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center space-y-3">
                <ShieldOff className="w-10 h-10 text-muted-foreground mx-auto" />
                <h3 className="font-semibold text-foreground">Procuring Access Required</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Your account does not have procuring entity access yet. Contact an
                  administrator to be granted permission to publish tenders.
                </p>
              </CardContent>
            </Card>
          ) : tenders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center space-y-3">
                <FileText className="w-10 h-10 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">No tenders yet. Post your first one.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {tenders.map((t) => (
                <Card key={t.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-base">{t.title}</CardTitle>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {t.sector && <Badge variant="secondary">{t.sector}</Badge>}
                          {t.budget_range && <Badge variant="outline">{t.budget_range}</Badge>}
                          {t.deadline && (
                            <Badge variant="outline">Due {t.deadline}</Badge>
                          )}
                          {t.location && <Badge variant="outline">{t.location}</Badge>}
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(t.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {t.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </PageTransition>
      <Footer />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Post a Tender</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Tender title"
              />
            </div>
            <div className="space-y-1">
              <Label>Description *</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Detailed description of the tender"
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Sector</Label>
                <Input
                  value={form.sector}
                  onChange={(e) => setForm({ ...form, sector: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Budget range</Label>
                <Input
                  value={form.budget_range}
                  onChange={(e) => setForm({ ...form, budget_range: e.target.value })}
                  placeholder="e.g. 10k - 50k EUR"
                />
              </div>
              <div className="space-y-1">
                <Label>Deadline</Label>
                <Input
                  type="date"
                  value={form.deadline}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Location</Label>
                <Input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Requirements</Label>
              <Textarea
                value={form.requirements}
                onChange={(e) => setForm({ ...form, requirements: e.target.value })}
                rows={2}
              />
            </div>
            <div className="space-y-1">
              <Label>Contact info</Label>
              <Input
                value={form.contact_info}
                onChange={(e) => setForm({ ...form, contact_info: e.target.value })}
                placeholder="Email / phone"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Publish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Procuring;
