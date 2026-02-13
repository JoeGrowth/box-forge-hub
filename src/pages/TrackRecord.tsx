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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  HandCoins,
  CheckCircle,
  HelpCircle,
  XCircle,
  ArrowRight,
} from "lucide-react";

interface EntrepreneurialData {
  id?: string;
  user_id: string;
  has_developed_project: boolean | null;
  project_description: string | null;
  project_count: number | null;
  project_needs_help: boolean | null;
  project_role: string | null;
  project_outcome: string | null;
  has_built_product: boolean | null;
  product_description: string | null;
  product_count: number | null;
  product_needs_help: boolean | null;
  product_stage: string | null;
  product_users_count: string | null;
  has_led_team: boolean | null;
  team_description: string | null;
  team_size: number | null;
  team_role: string | null;
  team_needs_help: boolean | null;
  has_run_business: boolean | null;
  business_description: string | null;
  business_count: number | null;
  business_needs_help: boolean | null;
  business_revenue: string | null;
  business_duration: string | null;
  has_served_on_board: boolean | null;
  board_description: string | null;
  board_count: number | null;
  board_needs_help: boolean | null;
  board_role_type: string | null;
  board_equity_details: string | null;
  is_completed: boolean | null;
}

interface SectionConfig {
  id: string;
  label: string;
  icon: React.ElementType;
  hasField: keyof EntrepreneurialData;
  descField: keyof EntrepreneurialData;
  countField: keyof EntrepreneurialData;
  helpField: keyof EntrepreneurialData;
  noun: string;
  countNoun: string;
  extraFields: Array<{
    key: keyof EntrepreneurialData;
    label: string;
    type: "text" | "textarea" | "select";
    placeholder?: string;
    options?: { value: string; label: string }[];
  }>;
}

const roleOptions = [
  { value: "founder", label: "Founder / Initiator" },
  { value: "co-founder", label: "Co-Founder" },
  { value: "project_lead", label: "Project Lead" },
  { value: "core_contributor", label: "Core Contributor" },
];

const stageOptions = [
  { value: "idea", label: "Idea / Concept" },
  { value: "prototype", label: "Prototype / PoC" },
  { value: "mvp", label: "MVP" },
  { value: "launched", label: "Launched / Live" },
  { value: "revenue", label: "Revenue-Generating" },
];

const teamRoleOptions = [
  { value: "team_lead", label: "Team Lead / Manager" },
  { value: "cto_coo", label: "CTO / COO / C-Level" },
  { value: "co-founder", label: "Co-Founder" },
  { value: "key_member", label: "Key Team Member" },
  { value: "advisor", label: "Advisor / Mentor" },
];

const equityTypeOptions = [
  { value: "board_member", label: "Board Member" },
  { value: "advisor", label: "Advisor / Mentor" },
  { value: "angel_investor", label: "Angel Investor" },
  { value: "equity_partner", label: "Equity Partner / Co-Founder" },
  { value: "pro_bono", label: "Pro Bono / Value Contributor" },
];

const formatSelectValue = (val: string | null, options: { value: string; label: string }[]) => {
  if (!val) return null;
  return options.find((o) => o.value === val)?.label || val;
};

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
          project_role: editData.project_role || null,
          project_outcome: editData.project_outcome || null,
          has_built_product: editData.has_built_product ?? null,
          product_description: editData.product_description || null,
          product_count: editData.product_count || null,
          product_needs_help: editData.product_needs_help ?? false,
          product_stage: editData.product_stage || null,
          product_users_count: editData.product_users_count || null,
          has_led_team: editData.has_led_team ?? null,
          team_description: editData.team_description || null,
          team_size: editData.team_size || null,
          team_role: editData.team_role || null,
          team_needs_help: editData.team_needs_help ?? false,
          has_run_business: editData.has_run_business ?? null,
          business_description: editData.business_description || null,
          business_count: editData.business_count || null,
          business_needs_help: editData.business_needs_help ?? false,
          business_revenue: editData.business_revenue || null,
          business_duration: editData.business_duration || null,
          has_served_on_board: editData.has_served_on_board ?? null,
          board_description: editData.board_description || null,
          board_count: editData.board_count || null,
          board_needs_help: editData.board_needs_help ?? false,
          board_role_type: editData.board_role_type || null,
          board_equity_details: editData.board_equity_details || null,
          is_completed: true,
        }, { onConflict: "user_id" });

      if (error) throw error;

      toast({ title: "Track Record Updated", description: "Your changes have been saved." });
      setIsEditing(false);

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

  const sections: SectionConfig[] = [
    {
      id: "section-projects",
      label: "Initiatives & Projects",
      icon: Lightbulb,
      hasField: "has_developed_project",
      descField: "project_description",
      countField: "project_count",
      helpField: "project_needs_help",
      noun: "initiative",
      countNoun: "initiative",
      extraFields: [
        { key: "project_role", label: "Role", type: "select", options: roleOptions },
        { key: "project_outcome", label: "Measurable Outcomes", type: "textarea", placeholder: "Outcomes achieved..." },
      ],
    },
    {
      id: "section-products",
      label: "Products & Prototypes",
      icon: Package,
      hasField: "has_built_product",
      descField: "product_description",
      countField: "product_count",
      helpField: "product_needs_help",
      noun: "product",
      countNoun: "product",
      extraFields: [
        { key: "product_stage", label: "Furthest Stage", type: "select", options: stageOptions },
        { key: "product_users_count", label: "Users/Customers Reached", type: "text", placeholder: "e.g., 500 users" },
      ],
    },
    {
      id: "section-team",
      label: "Team Experience",
      icon: Users,
      hasField: "has_led_team",
      descField: "team_description",
      countField: "team_size",
      helpField: "team_needs_help",
      noun: "team",
      countNoun: "member",
      extraFields: [
        { key: "team_role", label: "Your Role", type: "select", options: teamRoleOptions },
      ],
    },
    {
      id: "section-business",
      label: "Business & Commercial",
      icon: Building2,
      hasField: "has_run_business",
      descField: "business_description",
      countField: "business_count",
      helpField: "business_needs_help",
      noun: "business",
      countNoun: "business",
      extraFields: [
        { key: "business_revenue", label: "Revenue / Impact", type: "textarea", placeholder: "Revenue or impact details..." },
        { key: "business_duration", label: "Duration", type: "text", placeholder: "e.g., 2 years" },
      ],
    },
    {
      id: "section-equity",
      label: "Equity & Value Contributions",
      icon: HandCoins,
      hasField: "has_served_on_board",
      descField: "board_description",
      countField: "board_count",
      helpField: "board_needs_help",
      noun: "contribution",
      countNoun: "contribution",
      extraFields: [
        { key: "board_role_type", label: "Type", type: "select", options: equityTypeOptions },
        { key: "board_equity_details", label: "Value Details", type: "textarea", placeholder: "Equity or value details..." },
      ],
    },
  ];

  const getStatusIcon = (hasExperience: boolean | null, needsHelp: boolean | null) => {
    if (hasExperience === true) return <CheckCircle className="w-5 h-5 text-b4-teal" />;
    if (hasExperience === false && needsHelp) return <HelpCircle className="w-5 h-5 text-amber-500" />;
    return <XCircle className="w-5 h-5 text-muted-foreground" />;
  };

  const getStatusLabel = (hasExperience: boolean | null, needsHelp: boolean | null) => {
    if (hasExperience === true) return "Completed";
    if (hasExperience === false && needsHelp) return "Needs Help";
    return "No Experience";
  };

  const calculateProgress = () => {
    if (!data) return { completed: 0, total: 5, percentage: 0 };
    const completed = [
      data.has_developed_project === true,
      data.has_built_product === true,
      data.has_led_team === true,
      data.has_run_business === true,
      data.has_served_on_board === true,
    ].filter(Boolean).length;
    return { completed, total: 5, percentage: Math.round((completed / 5) * 100) };
  };

  const progress = calculateProgress();

  const renderEditExtraField = (field: SectionConfig["extraFields"][0]) => {
    const value = (editData as any)[field.key] || "";

    if (field.type === "select" && field.options) {
      return (
        <div key={field.key as string}>
          <Label className="text-sm">{field.label}</Label>
          <Select
            value={value}
            onValueChange={(val) => setEditData((prev) => ({ ...prev, [field.key]: val }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {field.options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (field.type === "textarea") {
      return (
        <div key={field.key as string}>
          <Label className="text-sm">{field.label}</Label>
          <Textarea
            value={value}
            onChange={(e) => setEditData((prev) => ({ ...prev, [field.key]: e.target.value }))}
            placeholder={field.placeholder}
            rows={2}
          />
        </div>
      );
    }

    return (
      <div key={field.key as string}>
        <Label className="text-sm">{field.label}</Label>
        <Input
          value={value}
          onChange={(e) => setEditData((prev) => ({ ...prev, [field.key]: e.target.value }))}
          placeholder={field.placeholder}
        />
      </div>
    );
  };

  const renderViewExtras = (s: SectionConfig) => {
    const extras = s.extraFields
      .map((ef) => {
        const val = (data as any)?.[ef.key];
        if (!val) return null;
        const displayVal = ef.type === "select" && ef.options
          ? formatSelectValue(val, ef.options) || val
          : val;
        return { label: ef.label, value: displayVal };
      })
      .filter(Boolean) as { label: string; value: string }[];

    if (extras.length === 0) return null;

    return (
      <div className="mt-3 space-y-1.5">
        {extras.map((e, i) => (
          <div key={i} className="flex gap-2">
            <span className="text-xs font-medium text-muted-foreground min-w-[80px]">{e.label}:</span>
            <span className="text-xs text-foreground">{e.value}</span>
          </div>
        ))}
      </div>
    );
  };

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
                  Review and update your entrepreneurial achievements across initiatives, products, teams, business, and value contributions.
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
                        Complete your entrepreneurial onboarding to start tracking your achievements.
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
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
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
                          {hasExp ? `${(data as any)[s.countField] || 0} ${s.countNoun}(s)` : needsHelp ? "Needs Help" : "No exp."}
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
                                      ...(checked
                                        ? { [s.helpField]: false }
                                        : {
                                            [s.descField]: "",
                                            [s.countField]: null,
                                            ...Object.fromEntries(s.extraFields.map((ef) => [ef.key, null])),
                                          }),
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
                                    <Label className="text-sm">How many {s.countNoun}(s)?</Label>
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
                                  {s.extraFields.map(renderEditExtraField)}
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
                                  {count || 0} {s.countNoun}(s)
                                </span>
                              </div>
                              {desc && <p className="text-foreground whitespace-pre-wrap">"{desc}"</p>}
                              {renderViewExtras(s)}
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
