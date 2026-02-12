import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import ResumeEditBar from "@/components/resume/ResumeEditBar";
import SectionActions from "@/components/resume/SectionActions";
import { Progress } from "@/components/ui/progress";
import {
  FileText,
  Loader2,
  TrendingUp,
  Lightbulb,
  Package,
  Building2,
  Users,
  CheckCircle,
  HelpCircle,
  XCircle,
  ArrowRight,
  Download,
} from "lucide-react";

interface EntrepreneurialData {
  id?: string;
  user_id: string;
  has_developed_project: boolean | null;
  project_description: string | null;
  project_count: number | null;
  project_needs_help: boolean | null;
  has_built_product: boolean | null;
  product_description: string | null;
  product_count: number | null;
  product_needs_help: boolean | null;
  has_run_business: boolean | null;
  business_description: string | null;
  business_count: number | null;
  business_needs_help: boolean | null;
  has_served_on_board: boolean | null;
  board_description: string | null;
  board_count: number | null;
  board_needs_help: boolean | null;
  is_completed: boolean | null;
}

const TrackRecord = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [data, setData] = useState<EntrepreneurialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState<Partial<EntrepreneurialData>>({});

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const { data: record, error } = await supabase
          .from("entrepreneurial_onboarding")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) throw error;
        setData(record as EntrepreneurialData | null);
        if (record) {
          setEditData(record);
        }
      } catch (err: any) {
        console.error("Error fetching track record:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const startEditing = (sectionId?: string) => {
    setIsEditing(true);
    if (sectionId) {
      setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("entrepreneurial_onboarding")
        .upsert({
          user_id: user.id,
          has_developed_project: editData.has_developed_project ?? null,
          project_description: editData.project_description || null,
          project_count: editData.project_count || null,
          project_needs_help: editData.project_needs_help ?? false,
          has_built_product: editData.has_built_product ?? null,
          product_description: editData.product_description || null,
          product_count: editData.product_count || null,
          product_needs_help: editData.product_needs_help ?? false,
          has_run_business: editData.has_run_business ?? null,
          business_description: editData.business_description || null,
          business_count: editData.business_count || null,
          business_needs_help: editData.business_needs_help ?? false,
          has_served_on_board: editData.has_served_on_board ?? null,
          board_description: editData.board_description || null,
          board_count: editData.board_count || null,
          board_needs_help: editData.board_needs_help ?? false,
          is_completed: true,
        }, { onConflict: "user_id" });

      if (error) throw error;

      toast({ title: "Track Record Updated", description: "Your changes have been saved." });
      setIsEditing(false);

      // Refetch
      const { data: updated } = await supabase
        .from("entrepreneurial_onboarding")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (updated) {
        setData(updated as EntrepreneurialData);
        setEditData(updated);
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to save.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (data) setEditData(data);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const sections = [
    {
      id: "section-projects",
      label: "Project Development",
      icon: Lightbulb,
      hasField: "has_developed_project" as const,
      descField: "project_description" as const,
      countField: "project_count" as const,
      helpField: "project_needs_help" as const,
      noun: "project",
    },
    {
      id: "section-products",
      label: "Product Building",
      icon: Package,
      hasField: "has_built_product" as const,
      descField: "product_description" as const,
      countField: "product_count" as const,
      helpField: "product_needs_help" as const,
      noun: "product",
    },
    {
      id: "section-business",
      label: "Business Experience",
      icon: Building2,
      hasField: "has_run_business" as const,
      descField: "business_description" as const,
      countField: "business_count" as const,
      helpField: "business_needs_help" as const,
      noun: "business",
    },
    {
      id: "section-board",
      label: "Board Service",
      icon: Users,
      hasField: "has_served_on_board" as const,
      descField: "board_description" as const,
      countField: "board_count" as const,
      helpField: "board_needs_help" as const,
      noun: "board",
    },
  ];

  const getStatusIcon = (hasExperience: boolean | null, needsHelp: boolean | null) => {
    if (hasExperience === true) return <CheckCircle className="w-5 h-5 text-b4-teal" />;
    if (hasExperience === false && needsHelp) return <HelpCircle className="w-5 h-5 text-amber-500" />;
    if (hasExperience === false) return <XCircle className="w-5 h-5 text-muted-foreground" />;
    return <XCircle className="w-5 h-5 text-muted-foreground" />;
  };

  const getStatusLabel = (hasExperience: boolean | null, needsHelp: boolean | null) => {
    if (hasExperience === true) return "Completed";
    if (hasExperience === false && needsHelp) return "Needs Help";
    return "No Experience";
  };

  const calculateProgress = () => {
    if (!data) return { completed: 0, total: 4, percentage: 0 };
    const completed = [
      data.has_developed_project === true,
      data.has_built_product === true,
      data.has_run_business === true,
      data.has_served_on_board === true,
    ].filter(Boolean).length;
    return { completed, total: 4, percentage: Math.round((completed / 4) * 100) };
  };

  const progress = calculateProgress();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20">
        {/* Header */}
        <section className="py-12 gradient-hero text-primary-foreground">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <FileText className="w-8 h-8" />
                  <h1 className="font-display text-3xl font-bold">Your Track Record</h1>
                </div>
                <p className="text-primary-foreground/80 max-w-xl">
                  Review and update your entrepreneurial experience across projects, products, business, and board service.
                </p>
              </div>
              {data && (
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 min-w-[200px]">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-sm font-medium">Experience</span>
                  </div>
                  <div className="text-3xl font-bold mb-2">{progress.percentage}%</div>
                  <Progress value={progress.percentage} className="h-2 bg-white/20" />
                  <p className="text-xs text-primary-foreground/70 mt-2">
                    {progress.completed} of {progress.total} areas with experience
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="py-12">
          <div className={`container max-w-5xl mx-auto px-4 ${isEditing ? "pb-24" : ""}`}>
            {/* Empty state */}
            {!data && (
              <Card className="mb-8 border-b4-teal/20 bg-b4-teal/5">
                <CardContent className="py-8">
                  <div className="flex flex-col items-center text-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-b4-teal/10 flex items-center justify-center">
                      <FileText className="w-8 h-8 text-b4-teal" />
                    </div>
                    <div>
                      <h3 className="font-display text-xl font-semibold text-foreground mb-2">Build Your Track Record</h3>
                      <p className="text-muted-foreground max-w-md mb-4">
                        Complete your entrepreneurial onboarding to start tracking your experience.
                      </p>
                      <Button variant="teal" onClick={() => navigate("/entrepreneurial-onboarding")}>
                        Start Onboarding
                        <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {data && (
              <div className="space-y-6 animate-fade-in">
                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  {sections.map((s) => {
                    const hasExp = (data as any)[s.hasField] === true;
                    const needsHelp = (data as any)[s.helpField] === true;
                    return (
                      <button
                        key={s.id}
                        onClick={() => startEditing(s.id)}
                        className={`rounded-xl p-4 text-center transition-all hover:scale-[1.02] ${
                          hasExp
                            ? "bg-b4-teal/10 border border-b4-teal/20"
                            : needsHelp
                            ? "bg-amber-500/10 border border-amber-500/30"
                            : "bg-muted/50 border border-dashed border-muted-foreground/20 hover:border-b4-teal/40"
                        }`}
                      >
                        <s.icon className={`w-5 h-5 mx-auto mb-1 ${hasExp ? "text-b4-teal" : needsHelp ? "text-amber-500" : "text-muted-foreground"}`} />
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                        <p className={`text-sm font-medium ${hasExp ? "text-b4-teal" : needsHelp ? "text-amber-500" : "text-muted-foreground"}`}>
                          {hasExp ? `${(data as any)[s.countField] || 0} ${s.noun}(s)` : needsHelp ? "Needs Help" : "No exp."}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* Section Cards */}
                <div className="grid gap-6">
                  {sections.map((s) => {
                    const hasExp = (editData as any)[s.hasField];
                    const desc = (editData as any)[s.descField] || "";
                    const count = (editData as any)[s.countField];
                    const needsHelp = (editData as any)[s.helpField];

                    return (
                      <Card
                        key={s.id}
                        id={s.id}
                        className={`transition-all scroll-mt-24 ${
                          !hasExp && !isEditing ? "border-dashed border-muted-foreground/30" : ""
                        }`}
                      >
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${hasExp ? "bg-b4-teal/10" : "bg-muted"}`}>
                                <s.icon className={`w-4 h-4 ${hasExp ? "text-b4-teal" : "text-muted-foreground"}`} />
                              </div>
                              {s.label}
                            </CardTitle>
                            <div className="flex items-center gap-2">
                              {!isEditing && (
                                <Badge
                                  variant={hasExp ? "default" : "secondary"}
                                  className={hasExp ? "bg-b4-teal" : ""}
                                >
                                  {getStatusLabel(hasExp, needsHelp)}
                                </Badge>
                              )}
                              <SectionActions
                                hasContent={hasExp === true}
                                isEditing={isEditing}
                                showHistory={false}
                                onEdit={() => startEditing(s.id)}
                                onToggleHistory={() => {}}
                                onAdd={() => startEditing(s.id)}
                              />
                            </div>
                          </div>
                          <CardDescription>
                            Your experience with {s.label.toLowerCase()}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {isEditing ? (
                            <div className="space-y-4">
                              <div className="flex items-center gap-3">
                                <Label className="text-sm">Have experience?</Label>
                                <Switch
                                  checked={hasExp === true}
                                  onCheckedChange={(checked) =>
                                    setEditData((prev) => ({
                                      ...prev,
                                      [s.hasField]: checked,
                                      ...(checked ? { [s.helpField]: false } : { [s.descField]: "", [s.countField]: null }),
                                    }))
                                  }
                                />
                              </div>
                              {hasExp === true && (
                                <>
                                  <div>
                                    <Label className="text-sm">Description</Label>
                                    <Textarea
                                      value={desc}
                                      onChange={(e) =>
                                        setEditData((prev) => ({ ...prev, [s.descField]: e.target.value }))
                                      }
                                      placeholder={`Describe your ${s.noun} experience...`}
                                      rows={3}
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-sm">How many {s.noun}(s)?</Label>
                                    <Input
                                      type="number"
                                      min={0}
                                      value={count ?? ""}
                                      onChange={(e) =>
                                        setEditData((prev) => ({
                                          ...prev,
                                          [s.countField]: e.target.value ? parseInt(e.target.value) : null,
                                        }))
                                      }
                                    />
                                  </div>
                                </>
                              )}
                              {hasExp === false && (
                                <div className="flex items-center gap-3">
                                  <Label className="text-sm">Do you need help with this?</Label>
                                  <Switch
                                    checked={needsHelp === true}
                                    onCheckedChange={(checked) =>
                                      setEditData((prev) => ({ ...prev, [s.helpField]: checked }))
                                    }
                                  />
                                </div>
                              )}
                            </div>
                          ) : hasExp === true ? (
                            <div className="space-y-2 bg-muted/30 rounded-lg p-4">
                              <div className="flex items-center gap-2">
                                {getStatusIcon(hasExp, needsHelp)}
                                <span className="text-sm font-medium text-foreground">
                                  {count || 0} {s.noun}(s)
                                </span>
                              </div>
                              {desc && <p className="text-foreground whitespace-pre-wrap">"{desc}"</p>}
                            </div>
                          ) : hasExp === false && needsHelp ? (
                            <div className="flex items-center gap-2 bg-amber-500/5 rounded-lg p-4">
                              <HelpCircle className="w-5 h-5 text-amber-500" />
                              <span className="text-sm text-amber-600">You requested assistance for this area.</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEditing(s.id)}
                              className="w-full text-center py-4 text-muted-foreground hover:bg-muted/30 rounded-lg transition-colors cursor-pointer"
                            >
                              <s.icon className="w-8 h-8 mx-auto mb-2 opacity-40" />
                              <p>Click to add your {s.noun} experience</p>
                            </button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />

      <ResumeEditBar
        open={isEditing}
        onSave={handleSave}
        onCancel={handleCancel}
        isSaving={isSaving}
      />
    </div>
  );
};

export default TrackRecord;
