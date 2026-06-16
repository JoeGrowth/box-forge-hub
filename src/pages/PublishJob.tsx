import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Loader2, Plus, Briefcase, Trash2 } from "lucide-react";

type Job = {
  id: string;
  title: string;
  description: string;
  company: string | null;
  location: string | null;
  salary_range: string | null;
  employment_type: string | null;
  sector: string | null;
  requirements: string | null;
  contact_info: string | null;
  status: string;
  created_at: string;
};

const PublishJob = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    company: "",
    location: "",
    salary_range: "",
    employment_type: "",
    sector: "",
    requirements: "",
    contact_info: "",
  });

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const res = await (supabase.from("job_opportunities" as any) as any)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setJobs((res.data || []) as Job[]);
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
    const { data, error } = await (supabase.from("job_opportunities" as any) as any)
      .insert({
        user_id: user.id,
        title: form.title.trim(),
        description: form.description.trim(),
        company: form.company.trim() || null,
        location: form.location.trim() || null,
        salary_range: form.salary_range.trim() || null,
        employment_type: form.employment_type.trim() || null,
        sector: form.sector.trim() || null,
        requirements: form.requirements.trim() || null,
        contact_info: form.contact_info.trim() || null,
        status: "published",
      })
      .select()
      .single();
    setSubmitting(false);
    if (error) {
      toast.error(error.message || "Failed to publish job.");
      return;
    }
    toast.success("Job published.");
    setJobs((prev) => [data as Job, ...prev]);
    setDialogOpen(false);
    setForm({
      title: "",
      description: "",
      company: "",
      location: "",
      salary_range: "",
      employment_type: "",
      sector: "",
      requirements: "",
      contact_info: "",
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this job?")) return;
    const { error } = await (supabase.from("job_opportunities" as any) as any).delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete.");
      return;
    }
    setJobs((prev) => prev.filter((j) => j.id !== id));
    toast.success("Job deleted.");
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="pt-24 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageTransition>
        <main className="container mx-auto px-4 pt-24 pb-16 max-w-6xl">
          <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground mb-1">
                Publishing Job Opportunity Form
              </h1>
              <p className="text-muted-foreground">
                Publish job opportunities that appear in the Opportunity Marketplace under Jobs.
              </p>
            </div>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Offer a Job
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            <Button variant="outline" onClick={() => navigate("/opportunities?tab=job")}>
              View Jobs in Marketplace
            </Button>
          </div>

          {jobs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center space-y-3">
                <Briefcase className="w-10 h-10 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">No jobs yet. Post your first one.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {jobs.map((j) => (
                <Card key={j.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-base">{j.title}</CardTitle>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {j.company && <Badge variant="secondary">{j.company}</Badge>}
                          {j.location && <Badge variant="outline">{j.location}</Badge>}
                          {j.salary_range && <Badge variant="outline">{j.salary_range}</Badge>}
                          {j.employment_type && <Badge variant="outline">{j.employment_type}</Badge>}
                          {j.sector && <Badge variant="outline">{j.sector}</Badge>}
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(j.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {j.description}
                    </p>
                    {j.requirements && (
                      <p className="text-sm text-muted-foreground mt-2">
                        <span className="font-semibold">Requirements:</span> {j.requirements}
                      </p>
                    )}
                    {j.contact_info && (
                      <p className="text-sm text-muted-foreground mt-1">
                        <span className="font-semibold">Contact:</span> {j.contact_info}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </PageTransition>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Offer a Job</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Job title"
              />
            </div>
            <div className="space-y-1">
              <Label>Description *</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Detailed description of the role and responsibilities"
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Company</Label>
                <Input
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  placeholder="Company name"
                />
              </div>
              <div className="space-y-1">
                <Label>Location</Label>
                <Input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="e.g. Remote, Paris"
                />
              </div>
              <div className="space-y-1">
                <Label>Salary range</Label>
                <Input
                  value={form.salary_range}
                  onChange={(e) => setForm({ ...form, salary_range: e.target.value })}
                  placeholder="e.g. 50k - 70k EUR"
                />
              </div>
              <div className="space-y-1">
                <Label>Employment type</Label>
                <Input
                  value={form.employment_type}
                  onChange={(e) => setForm({ ...form, employment_type: e.target.value })}
                  placeholder="Full-time, Part-time, Contract"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Sector</Label>
              <Input
                value={form.sector}
                onChange={(e) => setForm({ ...form, sector: e.target.value })}
                placeholder="e.g. Technology, Healthcare"
              />
            </div>
            <div className="space-y-1">
              <Label>Requirements</Label>
              <Textarea
                value={form.requirements}
                onChange={(e) => setForm({ ...form, requirements: e.target.value })}
                placeholder="Skills, experience, or qualifications required"
                rows={2}
              />
            </div>
            <div className="space-y-1">
              <Label>Contact info</Label>
              <Input
                value={form.contact_info}
                onChange={(e) => setForm({ ...form, contact_info: e.target.value })}
                placeholder="Email / phone for applicants"
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

export default PublishJob;
