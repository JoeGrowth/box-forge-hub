import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Briefcase,
  GraduationCap,
  FileText,
  Lightbulb,
  Calendar,
  MapPin,
  User,
  Check,
  Loader2,
  Bookmark,
  BookmarkCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { toast } from "sonner";
import { useSavedOpportunities } from "@/hooks/useSavedOpportunities";
import { useTrust, trustLevelStyle } from "@/hooks/useTrust";
import { useReputation, reputationLevelStyle } from "@/hooks/useReputation";

type Category = "job" | "training" | "consulting" | "tender";

const META: Record<Category, {
  table: string;
  titleField: string;
  icon: typeof Briefcase;
  label: string;
  actionLabel: string;
  actionType: "apply" | "join" | "request_contact";
  filter?: (q: any) => any;
  rewardField?: string;
  rewardLabel: string;
}> = {
  job: {
    table: "job_opportunities",
    titleField: "title",
    icon: Briefcase,
    label: "Job",
    actionLabel: "Apply for this role",
    actionType: "apply",
    filter: (q) => q.eq("status", "published"),
    rewardField: "salary_range",
    rewardLabel: "Salary",
  },
  training: {
    table: "training_opportunities",
    titleField: "title",
    icon: GraduationCap,
    label: "Training",
    actionLabel: "Request enrollment",
    actionType: "request_contact",
    filter: (q) => q.eq("review_status", "approved"),
    rewardField: undefined,
    rewardLabel: "Cost",
  },
  tender: {
    table: "tenders",
    titleField: "title",
    icon: FileText,
    label: "Tender",
    actionLabel: "Submit proposal",
    actionType: "apply",
    filter: (q) => q.eq("status", "published"),
    rewardField: "budget_range",
    rewardLabel: "Budget",
  },
  consulting: {
    table: "consulting_services",
    titleField: "service_title",
    icon: Lightbulb,
    label: "Consulting Service",
    actionLabel: "Request service",
    actionType: "request_contact",
    filter: (q) => q.eq("is_active", true),
    rewardField: "price",
    rewardLabel: "Price",
  },
};

export default function GenericOpportunityDetail({ category, id }: { category: Category; id: string }) {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { onboardingState } = useOnboarding();
  const [record, setRecord] = useState<any | null>(null);
  const [author, setAuthor] = useState<{ full_name: string | null; bio?: string | null; user_id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { isSaved, toggle } = useSavedOpportunities();
  const meta = META[category];
  const Icon = meta.icon;

  // Trust + reputation badges for the author.
  const { trust } = useTrust(author?.user_id ?? null);
  const trustStyle = trust && trust.level !== "unverified" ? trustLevelStyle(trust.level) : null;
  const { reputation } = useReputation(author?.user_id ?? null);
  const repStyle = reputation ? reputationLevelStyle(reputation.reputation_level) : null;

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth", { replace: true });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const isApproved =
      onboardingState?.journey_status === "approved" ||
      onboardingState?.journey_status === "entrepreneur_approved";
    if (onboardingState && !isApproved) navigate("/profile", { replace: true });
  }, [onboardingState, navigate]);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      let q: any = (supabase.from(meta.table as any) as any).select("*").eq("id", id);
      if (meta.filter) q = meta.filter(q);
      const { data, error } = await q.maybeSingle();
      if (error || !data) {
        toast.error("This opportunity is no longer available.");
        navigate("/opportunities", { replace: true });
        return;
      }
      setRecord(data);

      if (data.user_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, bio, user_id")
          .eq("user_id", data.user_id)
          .maybeSingle();
        if (profile) setAuthor(profile as any);
      }

      const { data: prior } = await (supabase.from("opportunity_interactions" as any) as any)
        .select("id")
        .eq("user_id", user.id)
        .eq("opportunity_id", id)
        .maybeSingle();
      if (prior) setSubmitted(true);

      setLoading(false);
    };
    load();
  }, [id, user, category]);

  const handleSubmit = async () => {
    if (!user || !record) return;
    setSubmitting(true);
    const { error } = await (supabase.from("opportunity_interactions" as any) as any).insert({
      user_id: user.id,
      opportunity_id: record.id,
      action_type: meta.actionType,
      message: message.trim() || null,
    });
    if (error) {
      if (error.code === "23505") {
        setSubmitted(true);
        toast.info("Already submitted.");
      } else {
        toast.error("Submission failed.");
      }
    } else {
      setSubmitted(true);
      toast.success("Submitted. The author will be notified.");
    }
    setSubmitting(false);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!record) return null;

  const title = record[meta.titleField] ?? "Untitled";
  const sector = record.sector;
  const location = record.location;
  const deadline = record.deadline;
  const requirements = record.requirements;
  const description = record.description;
  const reward = meta.rewardField
    ? category === "consulting"
      ? record.price > 0
        ? `${record.price} ${record.currency || ""}`.trim()
        : "Free"
      : record[meta.rewardField]
    : null;
  const isOwn = user?.id === record.user_id;
  const saved = isSaved(record.id);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/opportunities?tab=${category}`)}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Opportunities
          </Button>
        </div>

        <section className="py-8 border-b border-border">
          <div className="container mx-auto px-4">
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-8 h-8 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge variant="secondary">{meta.label}</Badge>
                  {sector && <Badge variant="outline">{sector}</Badge>}
                  {record.employment_type && <Badge variant="outline">{record.employment_type}</Badge>}
                  {record.format && <Badge variant="outline">{record.format}</Badge>}
                </div>
                <h1 className="font-display text-3xl font-bold text-foreground mb-3">{title}</h1>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  {author && (
                    <span className="flex items-center gap-1.5">
                      <User className="w-4 h-4" />
                      By {author.full_name || "Unknown"}
                      {trustStyle && (
                        <span className={`ml-1 px-1.5 py-0 rounded-full border text-[10px] font-medium ${trustStyle.className}`}>
                          {trustStyle.label}
                        </span>
                      )}
                      {repStyle && (
                        <span className={`ml-1 px-1.5 py-0 rounded-full border text-[10px] font-medium ${repStyle.className}`}>
                          {repStyle.label}
                        </span>
                      )}
                    </span>
                  )}
                  {location && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" /> {location}
                    </span>
                  )}
                  {deadline && (
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" /> Deadline {deadline}
                    </span>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggle(record.id, category)}
                className="shrink-0"
              >
                {saved ? <BookmarkCheck className="w-4 h-4 mr-1" /> : <Bookmark className="w-4 h-4 mr-1" />}
                {saved ? "Saved" : "Save"}
              </Button>
            </div>
          </div>
        </section>

        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <div className="bg-card rounded-2xl border border-border p-8">
                  <h2 className="font-display text-xl font-bold text-foreground mb-4">About this opportunity</h2>
                  <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{description}</p>
                </div>

                {requirements && (
                  <div className="bg-card rounded-2xl border border-border p-8">
                    <h2 className="font-display text-xl font-bold text-foreground mb-4">Requirements</h2>
                    <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{requirements}</p>
                  </div>
                )}

                {category === "training" && (record.target_audience || record.duration) && (
                  <div className="bg-card rounded-2xl border border-border p-8 grid sm:grid-cols-2 gap-4">
                    {record.target_audience && (
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Audience</p>
                        <p className="font-medium text-foreground">{record.target_audience}</p>
                      </div>
                    )}
                    {record.duration && (
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Duration</p>
                        <p className="font-medium text-foreground">{record.duration}</p>
                      </div>
                    )}
                  </div>
                )}

                {category === "job" && record.company && (
                  <div className="bg-card rounded-2xl border border-border p-8">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Company</p>
                    <p className="font-medium text-foreground">{record.company}</p>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-primary/20 p-6">
                  <h3 className="font-display text-lg font-bold text-foreground mb-3">{meta.actionLabel}</h3>
                  {reward && (
                    <div className="mb-4 text-sm">
                      <span className="text-muted-foreground">{meta.rewardLabel}: </span>
                      <span className="font-semibold text-foreground">{reward}</span>
                    </div>
                  )}

                  {isOwn ? (
                    <p className="text-sm text-muted-foreground italic">You posted this opportunity.</p>
                  ) : submitted ? (
                    <div className="flex items-center gap-2 text-primary">
                      <Check className="w-5 h-5" />
                      <span className="font-medium">Submitted — awaiting reply</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Textarea
                        placeholder="Optional: introduce yourself or note context"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={4}
                        maxLength={500}
                      />
                      <Button onClick={handleSubmit} disabled={submitting} className="w-full">
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        {meta.actionLabel}
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Your profile will be shared with the author.
                      </p>
                    </div>
                  )}
                </div>

                {author && (
                  <div className="bg-card rounded-2xl border border-border p-6">
                    <h3 className="font-display text-lg font-bold text-foreground mb-4">About the author</h3>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{author.full_name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">Author</p>
                      </div>
                    </div>
                    {author.bio && <p className="text-sm text-muted-foreground">{author.bio}</p>}
                    <Separator className="my-3" />
                    <Button variant="ghost" size="sm" className="w-full" onClick={() => navigate(`/co-builders?user=${author.user_id}`)}>
                      View profile
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
