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
import {
  modelFromJob,
  modelFromTraining,
  modelFromTender,
  modelFromConsulting,
  type OpportunityDetailModel,
} from "@/lib/opportunityModel";
import { emitOpportunityEvent } from "@/lib/opportunityEvents";
import { OpportunityStatusPanel } from "./OpportunityStatusPanel";

type Category = "job" | "training" | "consulting" | "tender";

const META: Record<Category, {
  table: string;
  icon: typeof Briefcase;
  label: string;
  actionType: "apply" | "request_contact";
  filter?: (q: any) => any;
  adapter: (raw: any, actorName: string) => OpportunityDetailModel;
}> = {
  job: {
    table: "job_opportunities",
    icon: Briefcase,
    label: "Job",
    actionType: "apply",
    filter: (q) => q.eq("status", "published"),
    adapter: modelFromJob,
  },
  training: {
    table: "training_opportunities",
    icon: GraduationCap,
    label: "Training",
    actionType: "request_contact",
    filter: (q) => q.eq("review_status", "approved"),
    adapter: modelFromTraining,
  },
  tender: {
    table: "tenders",
    icon: FileText,
    label: "Tender",
    actionType: "apply",
    filter: (q) => q.eq("status", "published"),
    adapter: modelFromTender,
  },
  consulting: {
    table: "consulting_services",
    icon: Lightbulb,
    label: "Consulting Service",
    actionType: "request_contact",
    filter: (q) => q.eq("is_active", true),
    adapter: modelFromConsulting,
  },
};

export default function GenericOpportunityDetail({ category, id }: { category: Category; id: string }) {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { onboardingState } = useOnboarding();
  const [model, setModel] = useState<OpportunityDetailModel | null>(null);
  const [actorBio, setActorBio] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { isSaved, toggle } = useSavedOpportunities(user?.id);
  const meta = META[category];
  const Icon = meta.icon;

  const { trust } = useTrust(model?.actor.user_id ?? null);
  const trustStyle = trust && trust.level !== "unverified" ? trustLevelStyle(trust.level) : null;
  const { reputation } = useReputation(model?.actor.user_id ?? null);
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

      let actorName = "Unknown";
      if (data.user_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, bio")
          .eq("user_id", data.user_id)
          .maybeSingle();
        if (profile) {
          actorName = profile.full_name || "Unknown";
          setActorBio(profile.bio ?? null);
        }
      }

      const built = meta.adapter(data, actorName);
      setModel(built);

      const { data: prior } = await (supabase.from("opportunity_interactions" as any) as any)
        .select("id")
        .eq("user_id", user.id)
        .eq("opportunity_id", id)
        .maybeSingle();
      if (prior) setSubmitted(true);

      // Fix 2: viewed event (day-bucketed, idempotent).
      void emitOpportunityEvent("user_viewed_opportunity", {
        userId: user.id,
        opportunityId: id,
        category,
      });

      setLoading(false);
    };
    load();
  }, [id, user, category]);

  const handleSubmit = async () => {
    if (!user || !model) return;
    setSubmitting(true);
    const { error } = await (supabase.from("opportunity_interactions" as any) as any).insert({
      user_id: user.id,
      opportunity_id: model.id,
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
      void emitOpportunityEvent("user_applied_opportunity", {
        userId: user.id,
        opportunityId: model.id,
        category,
        extra: { action_type: meta.actionType },
      });
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
  if (!model) return null;

  const isOwn = user?.id === model.actor.user_id;
  const saved = isSaved(model.id);

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
                  {model.context.sector && <Badge variant="outline">{model.context.sector}</Badge>}
                  {model.context.timeline && <Badge variant="outline">{model.context.timeline}</Badge>}
                </div>
                <h1 className="font-display text-3xl font-bold text-foreground mb-3">{model.title}</h1>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <User className="w-4 h-4" />
                    {model.actor.label}: {model.actor.name}
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
                  {model.context.location && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" /> {model.context.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" /> Posted {new Date(model.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggle(model.id, category)}
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
                  <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{model.description}</p>
                </div>

                {model.requirements.requirements_text && (
                  <div className="bg-card rounded-2xl border border-border p-8">
                    <h2 className="font-display text-xl font-bold text-foreground mb-4">Requirements</h2>
                    <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      {model.requirements.requirements_text}
                    </p>
                  </div>
                )}

                {model.requirements.skills.length > 0 && (
                  <div className="bg-card rounded-2xl border border-border p-8">
                    <h2 className="font-display text-xl font-bold text-foreground mb-4">Skills & attributes</h2>
                    <div className="flex flex-wrap gap-2">
                      {model.requirements.skills.map((s) => (
                        <Badge key={s} variant="secondary">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                {submitted && user && (
                  <OpportunityStatusPanel
                    userId={user.id}
                    opportunityId={model.id}
                    source="opportunity_interactions"
                  />
                )}

                <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-primary/20 p-6">
                  <h3 className="font-display text-lg font-bold text-foreground mb-3">{model.actions.primary.label}</h3>
                  <div className="mb-4 text-sm">
                    <span className="text-muted-foreground capitalize">{model.reward.type}: </span>
                    <span className="font-semibold text-foreground">{model.reward.display}</span>
                  </div>

                  {isOwn ? (
                    <p className="text-sm text-muted-foreground italic">You posted this opportunity.</p>
                  ) : submitted ? (
                    <div className="flex items-center gap-2 text-primary">
                      <Check className="w-5 h-5" />
                      <span className="font-medium">Submitted — see status above</span>
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
                        {model.actions.primary.label}
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Your profile will be shared with the author.
                      </p>
                    </div>
                  )}
                </div>

                {model.actor.user_id && (
                  <div className="bg-card rounded-2xl border border-border p-6">
                    <h3 className="font-display text-lg font-bold text-foreground mb-4">About the {model.actor.label.toLowerCase()}</h3>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{model.actor.name}</p>
                        <p className="text-xs text-muted-foreground">{model.actor.label}</p>
                      </div>
                    </div>
                    {actorBio && <p className="text-sm text-muted-foreground">{actorBio}</p>}
                    <Separator className="my-3" />
                    <Button variant="ghost" size="sm" className="w-full" onClick={() => navigate(`/co-builders?user=${model.actor.user_id}`)}>
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
