import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/layout/PageTransition";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { supabase } from "@/integrations/supabase/client";
import { Search, User, Briefcase, Loader2, Pencil, Check, X, ShieldCheck, Award, MessageCircle, Rocket, Eye, Users, Sparkles, Lock } from "lucide-react";
import { toast } from "sonner";
import { DirectorySkeletonGrid } from "@/components/ui/skeleton-card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useExpertiseBatch, type Expertise } from "@/hooks/useExpertise";
import { useTrustBatch, trustLevelStyle } from "@/hooks/useTrust";

type DirectoryFilter = "talents" | "cobuilders" | "advisors" | "initiators";
const COBUILDER_STAGES = new Set(["capable", "monetizing", "building", "founder"]);

interface CoBuilder {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  primary_skills: string | null;
  natural_role_description: string | null;
  certCount: number;        // derived from expertise_graph (monetizable.certifications)
  verifiedCount: number;    // expertise_graph.verified_expertise_count
  expertiseLevel: Expertise["level"];
  has_opportunity: boolean;
  opportunity_id: string | null;
  opportunity_title: string | null;
  stage: string;
}

interface NaturalRolePreview {
  description: string | null;
  promise_check: boolean | null;
  practice_check: boolean | null;
  practice_entities: string | null;
  practice_case_studies: number | null;
  training_check: boolean | null;
  training_count: number | null;
  training_contexts: string | null;
  consulting_check: boolean | null;
  consulting_with_whom: string | null;
  consulting_case_studies: string | null;
}

const VALID_TABS: DirectoryFilter[] = ["talents", "cobuilders", "initiators", "advisors"];

const CoBuilders = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [cobuilders, setCobuilders] = useState<CoBuilder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingSkills, setEditingSkills] = useState(false);
  const [skillsInput, setSkillsInput] = useState("");
  const [savingSkills, setSavingSkills] = useState(false);
  const [startingChat, setStartingChat] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<NaturalRolePreview | null>(null);
  const [previewName, setPreviewName] = useState<string>("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [myStage, setMyStage] = useState<string>("novice");
  const canSeeCobuilders = COBUILDER_STAGES.has(myStage);
  const initialTab = (() => {
    const t = searchParams.get("tab") as DirectoryFilter | null;
    return t && VALID_TABS.includes(t) ? t : "talents";
  })();
  const [filter, setFilterState] = useState<DirectoryFilter>(initialTab);
  const [canSeeAdvisors, setCanSeeAdvisors] = useState(false);
  const [canSeeInitiators, setCanSeeInitiators] = useState(false);
  const [advisorUserIds, setAdvisorUserIds] = useState<Set<string>>(new Set());

  // Keep URL in sync with selected tab for deep-linking and refresh-persistence.
  const setFilter = (next: DirectoryFilter) => {
    setFilterState(next);
    const sp = new URLSearchParams(searchParams);
    sp.set("tab", next);
    setSearchParams(sp, { replace: true });
  };

  // React to back/forward navigation changing ?tab=
  useEffect(() => {
    const t = searchParams.get("tab") as DirectoryFilter | null;
    if (t && VALID_TABS.includes(t) && t !== filter) {
      setFilterState(t);
    }
    // If URL requests initiators but user isn't an initiator, fall back to talents.
    if (t === "initiators" && !canSeeInitiators) {
      setFilter("talents");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, canSeeInitiators]);

  // Fetch viewer's progression stage to gate the Co-Builders filter tab.
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from("progression_graph")
        .select("current_state")
        .eq("user_id", user.id)
        .maybeSingle();
      const stage = (data as any)?.current_state ?? "novice";
      setMyStage(stage);
      // Only auto-switch when there is no explicit tab in the URL.
      if (COBUILDER_STAGES.has(stage) && !searchParams.get("tab")) {
        setFilter("cobuilders");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Gate the Advisors tab via server-validated SECURITY DEFINER RPC.
  // Protects against client-side route tampering.
  useEffect(() => {
    if (!user?.id) {
      setCanSeeAdvisors(false);
      return;
    }
    (async () => {
      const { data, error } = await supabase.rpc("can_view_advisors_directory");
      const allowed = !error && data === true;
      setCanSeeAdvisors(allowed);
      // If URL requests advisors but user isn't authorized, fall back to talents.
      if (!allowed && (searchParams.get("tab") as DirectoryFilter) === "advisors") {
        setFilter("talents");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Load advisor user_ids (active assignments) — only when authorized.
  useEffect(() => {
    if (!canSeeAdvisors) {
      setAdvisorUserIds(new Set());
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("box_advisors")
        .select("user_id, status")
        .eq("status", "active");
      const set = new Set<string>((data || []).map((r: any) => r.user_id));
      setAdvisorUserIds(set);
    })();
  }, [canSeeAdvisors]);

  // Two-stage load: (1) fetch profile/role/idea rows for approved users,
  // (2) hydrate per-user expertise via the batch graph hook below.
  // Expertise (certification count, level) is sourced ONLY from
  // expertise_graph — never from user_certifications.
  const [approvedUserIds, setApprovedUserIds] = useState<string[]>([]);
  const [baseRows, setBaseRows] = useState<Omit<CoBuilder, "certCount" | "verifiedCount" | "expertiseLevel">[]>([]);
  const { byUser: expertiseByUser } = useExpertiseBatch(approvedUserIds);
  const { byUser: trustByUser } = useTrustBatch(approvedUserIds);

  useEffect(() => {
    const fetchBase = async () => {
      setLoading(true);
      try {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, user_id, full_name, avatar_url, primary_skills, current_stage")
          .not("full_name", "is", null);
        if (profilesError) throw profilesError;

        const ids = profiles?.map((p) => p.user_id) || [];
        setApprovedUserIds(ids);
        if (ids.length === 0) { setBaseRows([]); setLoading(false); return; }

        const [{ data: naturalRoles, error: rolesError }, { data: startupIdeas, error: ideasError }] = await Promise.all([
          supabase.from("natural_roles").select("user_id, description").in("user_id", ids),
          supabase.from("startup_ideas").select("id, creator_id, title").eq("status", "active").eq("is_looking_for_cobuilders", true).in("creator_id", ids),
        ]);
        if (rolesError) throw rolesError;
        if (ideasError) throw ideasError;

        const rows = (profiles || []).map((profile) => {
          const nr = naturalRoles?.find((n) => n.user_id === profile.user_id);
          const idea = startupIdeas?.find((i) => i.creator_id === profile.user_id);
          return {
            ...profile,
            stage: (profile as any).current_stage || "novice",
            natural_role_description: nr?.description || null,
            has_opportunity: !!idea,
            opportunity_id: idea?.id || null,
            opportunity_title: idea?.title || null,
          };
        });
        setBaseRows(rows as any);

        const me = rows.find((r) => r.user_id === user?.id);
        if (me) {
          setSkillsInput(me.primary_skills || "");
          setCanSeeInitiators(!!me.has_opportunity);
        } else {
          setCanSeeInitiators(false);
        }
      } catch (error) {
        console.error("Error fetching co-builders:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBase();
  }, [user?.id]);

  // Merge base rows with batch expertise + apply directory sort.
  useEffect(() => {
    if (baseRows.length === 0) { setCobuilders([]); return; }
    const merged: CoBuilder[] = baseRows.map((r) => {
      const exp = expertiseByUser.get(r.user_id);
      return {
        ...r,
        certCount: exp?.monetizable.certifications ?? 0,
        verifiedCount: exp?.verifiedCount ?? 0,
        expertiseLevel: exp?.level ?? "novice",
      };
    });
    merged.sort((a, b) => {
      if (a.user_id === user?.id) return -1;
      if (b.user_id === user?.id) return 1;
      const certDiff = b.certCount - a.certCount;
      if (certDiff !== 0) return certDiff;
      const aHasSkills = a.primary_skills && a.primary_skills.trim().length > 0 ? 1 : 0;
      const bHasSkills = b.primary_skills && b.primary_skills.trim().length > 0 ? 1 : 0;
      return bHasSkills - aHasSkills;
    });
    setCobuilders(merged);
  }, [baseRows, expertiseByUser, user?.id]);

  const handleSaveSkills = async () => {
    if (!user) return;

    setSavingSkills(true);
    try {
      const { error } = await supabase.from("profiles").update({ primary_skills: skillsInput }).eq("user_id", user.id);

      if (error) throw error;

      // Update local state
      setCobuilders((prev) => prev.map((cb) => (cb.user_id === user.id ? { ...cb, primary_skills: skillsInput } : cb)));

      setEditingSkills(false);
      toast.success("Skills updated successfully!");
    } catch (error) {
      console.error("Error saving skills:", error);
      toast.error("Failed to save skills");
    } finally {
      setSavingSkills(false);
    }
  };

  const handleCancelEdit = () => {
    const currentUserProfile = cobuilders.find((cb) => cb.user_id === user?.id);
    setSkillsInput(currentUserProfile?.primary_skills || "");
    setEditingSkills(false);
  };

  const handleStartChat = async (otherUserId: string) => {
    if (!user) return;
    
    setStartingChat(otherUserId);
    try {
      // Check if conversation already exists (in either direction)
      const { data: existingConv } = await supabase
        .from("direct_conversations")
        .select("id")
        .or(`and(participant_one_id.eq.${user.id},participant_two_id.eq.${otherUserId}),and(participant_one_id.eq.${otherUserId},participant_two_id.eq.${user.id})`)
        .maybeSingle();

      if (existingConv) {
        navigate(`/messages/${existingConv.id}`);
        return;
      }

      // Create new conversation
      const { data: newConv, error } = await supabase
        .from("direct_conversations")
        .insert({
          participant_one_id: user.id,
          participant_two_id: otherUserId,
        })
        .select()
        .single();

      if (error) throw error;

      navigate(`/messages/${newConv.id}`);
    } catch (error) {
      console.error("Error starting chat:", error);
      toast.error("Failed to start chat");
    } finally {
      setStartingChat(null);
    }
  };

  const handlePreview = async (cobuilder: CoBuilder) => {
    setPreviewName(cobuilder.full_name || "Co-Builder");
    setPreviewOpen(true);
    setPreviewLoading(true);
    try {
      const { data, error } = await supabase
        .from("natural_roles")
        .select("description, promise_check, practice_check, practice_entities, practice_case_studies, training_check, training_count, training_contexts, consulting_check, consulting_with_whom, consulting_case_studies")
        .eq("user_id", cobuilder.user_id)
        .maybeSingle();
      if (error) throw error;
      setPreviewData(data as NaturalRolePreview | null);
    } catch (error) {
      console.error("Error fetching preview:", error);
      toast.error("Failed to load preview");
    } finally {
      setPreviewLoading(false);
    }
  };

  // Talents tab = all approved users (including co-builders and advisors),
  // ordered by progression stage: monetizing → capable → emerging → novice.
  // Stages "building" and "founder" are excluded from Talents.
  const TALENTS_STAGE_RANK: Record<string, number> = {
    monetizing: 0,
    capable: 1,
    emerging: 2,
    novice: 3,
  };
  const filteredCobuilders = cobuilders.filter((cb) => {
    if (filter === "advisors") {
      if (!advisorUserIds.has(cb.user_id)) return false;
    } else if (filter === "initiators") {
      if (!cb.has_opportunity) return false;
    } else if (filter === "talents") {
      const stage = (cb.stage || "novice").toLowerCase();
      if (cb.user_id !== user?.id && !(stage in TALENTS_STAGE_RANK)) return false;
    } else if (cb.user_id !== user?.id) {
      if (filter === "cobuilders" && cb.certCount < 1) return false;
    }
    const searchLower = searchQuery.toLowerCase();
    const nameMatch = cb.full_name?.toLowerCase().includes(searchLower);
    const skillsMatch = cb.primary_skills?.toLowerCase().includes(searchLower);
    const roleMatch = cb.natural_role_description?.toLowerCase().includes(searchLower);
    return nameMatch || skillsMatch || roleMatch;
  });

  if (filter === "talents") {
    filteredCobuilders.sort((a, b) => {
      if (a.user_id === user?.id) return -1;
      if (b.user_id === user?.id) return 1;
      const ra = TALENTS_STAGE_RANK[(a.stage || "novice").toLowerCase()] ?? 99;
      const rb = TALENTS_STAGE_RANK[(b.stage || "novice").toLowerCase()] ?? 99;
      if (ra !== rb) return ra - rb;
      return (b.certCount || 0) - (a.certCount || 0);
    });
  }

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const parseSkills = (skills: string | null): string[] => {
    if (!skills) return [];
    return skills
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  };

  // Show loading until auth is ready
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="pt-20 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-b4-teal" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <PageTransition>
          <main className="pt-20">
            <section className="py-16">
              <div className="container mx-auto px-4 text-center">
                <h1 className="font-display text-3xl font-bold text-foreground mb-4">Co-Builders Directory</h1>
                <p className="text-muted-foreground mb-8">Please log in to access the co-builders directory.</p>
              </div>
            </section>
          </main>
        </PageTransition>
        <Footer />
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-background">
      <PageTransition>
        <main className="pt-20">
          {/* Header */}
          <section className="py-12 gradient-hero text-primary-foreground">
            <div className="container mx-auto px-4">
              <div className="flex items-center gap-3 mb-2">
                <User className="w-8 h-8" />
                <h1 className="font-display text-3xl font-bold">People</h1>
              </div>
              <p className="text-primary-foreground/80 max-w-2xl">
                Discover talented people with the skills and natural roles that match your startup needs.
              </p>
            </div>
          </section>

          {/* Search and Filter */}
          <section className="py-8 border-b border-border">
            <div className="container mx-auto px-4 flex flex-col md:flex-row md:items-center gap-4">
              <Tabs value={filter} onValueChange={(v) => setFilter(v as DirectoryFilter)}>
                <TabsList>
                  <TabsTrigger value="talents" className="gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Talents
                  </TabsTrigger>
                  <TabsTrigger
                    value="cobuilders"
                    disabled={!canSeeCobuilders}
                    className="gap-1.5"
                    title={canSeeCobuilders ? undefined : "Unlocks at Capable stage"}
                  >
                    {canSeeCobuilders ? <Users className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                    Co-Builders
                  </TabsTrigger>
                  <TabsTrigger value="initiators" className="gap-1.5">
                    <Rocket className="w-3.5 h-3.5" /> Initiators
                  </TabsTrigger>
                  {canSeeAdvisors && (
                    <TabsTrigger value="advisors" className="gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" /> Advisors
                    </TabsTrigger>
                  )}
                </TabsList>
              </Tabs>
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Search by name, skills, or natural role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              {!canSeeCobuilders && (
                <p className="text-xs text-muted-foreground md:ml-auto">
                  Co-Builders unlocks at <span className="font-medium">Capable</span> stage.
                </p>
              )}
            </div>
          </section>

          {/* Co-Builders Grid */}
          <section className="py-12">
            <div className="container mx-auto px-4">
              {loading ? (
                <DirectorySkeletonGrid count={6} type="cobuilder" />
              ) : filteredCobuilders.length === 0 ? (
                <div className="text-center py-12">
                  <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {searchQuery ? "No co-builders match your search." : "No co-builders found."}
                  </p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCobuilders.map((cobuilder) => {
                    const isCurrentUser = cobuilder.user_id === user?.id;
                    const certCount = cobuilder.certCount;

                    const stageKey = (cobuilder.stage || "novice").toLowerCase();

                    // In Talents tab, tint cards slightly by progression stage.
                    const talentStageStyle: Record<string, { card: string; avatar: string; text: string }> = {
                      monetizing: {
                        card: "bg-emerald-500/5 border-emerald-500/40 ring-1 ring-emerald-500/20 hover:border-emerald-500/60",
                        avatar: "bg-emerald-500/15 text-emerald-600",
                        text: "text-emerald-600 font-medium",
                      },
                      capable: {
                        card: "bg-sky-500/5 border-sky-500/40 ring-1 ring-sky-500/20 hover:border-sky-500/60",
                        avatar: "bg-sky-500/15 text-sky-600",
                        text: "text-sky-600 font-medium",
                      },
                      emerging: {
                        card: "bg-amber-500/5 border-amber-500/40 ring-1 ring-amber-500/20 hover:border-amber-500/60",
                        avatar: "bg-amber-500/15 text-amber-600",
                        text: "text-amber-600 font-medium",
                      },
                      novice: {
                        card: "bg-card border-border hover:border-muted-foreground/30",
                        avatar: "bg-muted text-muted-foreground",
                        text: "text-muted-foreground",
                      },
                    };
                    const talentStyle =
                      filter === "talents" ? talentStageStyle[stageKey] ?? talentStageStyle.novice : null;

                    // Visual differentiation based on certification count
                    const getCardStyle = () => {
                      if (isCurrentUser) return "bg-b4-teal/5 border-b4-teal ring-2 ring-b4-teal/20";
                      if (talentStyle) return talentStyle.card;
                      if (certCount >= 2) return "bg-card border-b4-purple/40 ring-1 ring-b4-purple/20 hover:border-b4-purple/60";
                      if (certCount === 1) return "bg-card border-b4-teal/40 ring-1 ring-b4-teal/20 hover:border-b4-teal/60";
                      return "bg-card border-border hover:border-muted-foreground/30";
                    };

                    const getAvatarStyle = () => {
                      if (isCurrentUser) return "bg-b4-teal text-white";
                      if (talentStyle) return talentStyle.avatar;
                      if (certCount >= 2) return "bg-gradient-to-br from-b4-teal to-b4-purple text-white";
                      if (certCount === 1) return "bg-b4-teal/15 text-b4-teal";
                      return "bg-muted text-muted-foreground";
                    };

                    const getStatusLabel = () => {
                      if (filter === "talents") {
                        return stageKey.charAt(0).toUpperCase() + stageKey.slice(1);
                      }
                      if (certCount >= 2) return "Fully Certified";
                      if (certCount === 1) return "Certified";
                      const s = cobuilder.stage || "novice";
                      return s.charAt(0).toUpperCase() + s.slice(1);
                    };

                    return (
                      <div
                        key={cobuilder.id}
                        className={`group rounded-2xl border p-6 transition-all duration-300 relative flex flex-col h-full shadow-sm hover:shadow-xl hover:-translate-y-1 ${getCardStyle()}`}
                      >
                        {/* Preview Button - top right */}
                        <button
                          onClick={() => handlePreview(cobuilder)}
                          className="absolute top-3 right-3 p-1.5 rounded-lg text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground hover:bg-muted transition-all"
                          title="Preview"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {/* Current User Badge */}
                        {isCurrentUser && (
                          <div className="mb-3">
                            <Badge className="bg-b4-teal text-white">You</Badge>
                          </div>
                        )}

                        {/* Avatar and Name */}
                        <div className="flex items-center gap-4 mb-4">
                          <div
                            className={`w-16 h-16 rounded-full flex items-center justify-center font-semibold text-lg ring-2 ring-background shadow-md overflow-hidden shrink-0 ${getAvatarStyle()}`}
                          >
                            {cobuilder.avatar_url ? (
                              <img
                                src={cobuilder.avatar_url}
                                alt={cobuilder.full_name || "Co-builder"}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              getInitials(cobuilder.full_name)
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-display font-semibold text-foreground">
                                {cobuilder.full_name || "Anonymous Co-Builder"}
                              </h3>
                              {certCount >= 2 && (
                                <span title="Fully Certified">
                                  <ShieldCheck className="w-4 h-4 text-b4-purple" />
                                </span>
                              )}
                              {certCount === 1 && (
                                <span title="Certified">
                                  <ShieldCheck className="w-4 h-4 text-b4-teal" />
                                </span>
                              )}
                              {/* Opportunity Icon */}
                              {cobuilder.has_opportunity && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          navigate(`/opportunities/${cobuilder.opportunity_id}`);
                                        }}
                                        className="text-amber-500 hover:text-amber-600 transition-colors"
                                        title={cobuilder.opportunity_title || "View Opportunity"}
                                      >
                                        <Rocket className="w-4 h-4" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="text-xs">Has an idea: {cobuilder.opportunity_title}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              <span className={`text-sm ${talentStyle ? talentStyle.text : certCount >= 2 ? "text-b4-purple font-medium" : certCount === 1 ? "text-b4-teal font-medium" : "text-muted-foreground"}`}>
                                {getStatusLabel()}
                              </span>
                              {certCount > 0 && (
                                <Badge
                                  className="bg-gradient-to-r from-b4-teal to-b4-purple text-white text-xs py-0 px-2"
                                  title={`Expertise level: ${cobuilder.expertiseLevel}`}
                                >
                                  <Award className="w-3 h-3 mr-1" />
                                  {certCount} cert{certCount > 1 ? "s" : ""}
                                  {cobuilder.verifiedCount > 0 && ` · ${cobuilder.verifiedCount} verified`}
                                </Badge>
                              )}
                              {(() => {
                                const t = trustByUser.get(cobuilder.user_id);
                                if (!t || t.level === "unverified") return null;
                                const style = trustLevelStyle(t.level);
                                return (
                                  <Badge
                                    variant="outline"
                                    className={`text-xs py-0 px-2 ${style.className}`}
                                    title={`Trust score: ${Math.round(t.score)}`}
                                  >
                                    <ShieldCheck className="w-3 h-3 mr-1" />
                                    {style.label}
                                  </Badge>
                                );
                              })()}
                            </div>
                          </div>
                        </div>

                        {/* Natural Role */}
                        {cobuilder.natural_role_description && (
                          <div className="mb-4">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                              <Briefcase className="w-4 h-4" />
                              <span>Natural Role</span>
                            </div>
                            <p className="text-sm text-foreground italic line-clamp-2">
                              "{cobuilder.natural_role_description}"
                            </p>
                          </div>
                        )}

                        {/* Skills */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <User className="w-4 h-4" />
                              <span>Skills</span>
                            </div>
                            {isCurrentUser && !editingSkills && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingSkills(true)}
                                className="h-7 px-2 text-b4-teal hover:text-b4-teal/80"
                              >
                                <Pencil className="w-3.5 h-3.5 mr-1" />
                                Edit
                              </Button>
                            )}
                          </div>

                          {isCurrentUser && editingSkills ? (
                            <div className="space-y-2">
                              <Input
                                placeholder="Enter skills separated by commas..."
                                value={skillsInput}
                                onChange={(e) => setSkillsInput(e.target.value)}
                                className="text-sm"
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={handleSaveSkills}
                                  disabled={savingSkills}
                                  className="bg-b4-teal hover:bg-b4-teal/90"
                                >
                                  {savingSkills ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Check className="w-3.5 h-3.5" />
                                  )}
                                  <span className="ml-1">Save</span>
                                </Button>
                                <Button size="sm" variant="outline" onClick={handleCancelEdit} disabled={savingSkills}>
                                  <X className="w-3.5 h-3.5" />
                                  <span className="ml-1">Cancel</span>
                                </Button>
                              </div>
                            </div>
                          ) : cobuilder.primary_skills ? (
                            (() => {
                              const allSkills = parseSkills(cobuilder.primary_skills);
                              const visible = allSkills.slice(0, 5);
                              const hidden = allSkills.slice(5);
                              return (
                                <div className="flex flex-wrap gap-1.5">
                                  {visible.map((skill, idx) => (
                                    <Badge
                                      key={idx}
                                      variant="secondary"
                                      className="bg-b4-teal/10 text-b4-teal border border-b4-teal/20 hover:bg-b4-teal/15 transition-colors font-medium text-xs px-2.5 py-0.5"
                                    >
                                      {skill}
                                    </Badge>
                                  ))}
                                  {hidden.length > 0 && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Badge
                                            variant="outline"
                                            className="text-muted-foreground border-dashed cursor-help text-xs px-2.5 py-0.5"
                                          >
                                            +{hidden.length} more
                                          </Badge>
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs">
                                          <p className="text-xs">{hidden.join(", ")}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                              );
                            })()
                          ) : (
                            <p className="text-sm text-muted-foreground italic">
                              {isCurrentUser ? "Click Edit to add your skills" : "No skills added yet"}
                            </p>
                          )}
                        </div>

                        {!cobuilder.primary_skills && !cobuilder.natural_role_description && !isCurrentUser && (
                          <p className="text-sm text-muted-foreground italic mt-2">
                            No skills or natural role added yet.
                          </p>
                        )}

                        {/* Bottom action area — pinned so Message buttons align across cards */}
                        <div className="mt-auto">
                          {/* Get Vaccinated Button - shown on current user's card if no cobuilder certification */}
                          {isCurrentUser && cobuilder.certCount === 0 && (
                            <div className="mt-4 pt-4 border-t border-border">
                              <Button
                                variant="teal"
                                size="sm"
                                onClick={() => navigate("/journey?section=cobuilder")}
                                className="w-full gap-2"
                              >
                                <ShieldCheck className="w-4 h-4" />
                                Get Vaccinated Co Builder
                              </Button>
                            </div>
                          )}

                          {/* Message Button */}
                          {!isCurrentUser && (
                            <div className="mt-4 pt-4 border-t border-border">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStartChat(cobuilder.user_id)}
                                disabled={startingChat === cobuilder.user_id}
                                className="w-full gap-2"
                              >
                                {startingChat === cobuilder.user_id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <MessageCircle className="w-4 h-4" />
                                )}
                                Message
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </main>
      </PageTransition>
      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-b4-teal" />
              {previewName} — Aperçu
            </DialogTitle>
          </DialogHeader>
          {previewLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-b4-teal" />
            </div>
          ) : !previewData ? (
            <p className="text-sm text-muted-foreground italic py-4">No onboarding data available.</p>
          ) : (
            <div className="space-y-4 text-sm">
              {/* Natural Role */}
              <div>
                <h4 className="font-semibold text-foreground flex items-center gap-2 mb-1">
                  <Briefcase className="w-4 h-4 text-b4-teal" /> Natural Role
                </h4>
                <p className="text-muted-foreground italic">
                  {previewData.description ? `"${previewData.description}"` : "Not defined"}
                </p>
              </div>

              <div className="border-t border-border" />

              {/* Practice */}
              <div>
                <h4 className="font-semibold text-foreground mb-1">Practice</h4>
                {previewData.practice_check ? (
                  <div className="space-y-1 text-muted-foreground">
                    {previewData.practice_entities && <p><span className="font-medium text-foreground">Entities:</span> {previewData.practice_entities}</p>}
                    {previewData.practice_case_studies != null && <p><span className="font-medium text-foreground">Case studies:</span> {previewData.practice_case_studies}</p>}
                  </div>
                ) : (
                  <p className="text-muted-foreground italic">No practice experience</p>
                )}
              </div>

              <div className="border-t border-border" />

              {/* Training */}
              <div>
                <h4 className="font-semibold text-foreground mb-1">Training</h4>
                {previewData.training_check ? (
                  <div className="space-y-1 text-muted-foreground">
                    {previewData.training_count != null && <p><span className="font-medium text-foreground">Sessions:</span> {previewData.training_count}</p>}
                    {previewData.training_contexts && <p><span className="font-medium text-foreground">Contexts:</span> {previewData.training_contexts}</p>}
                  </div>
                ) : (
                  <p className="text-muted-foreground italic">No training experience</p>
                )}
              </div>

              <div className="border-t border-border" />

              {/* Consulting */}
              <div>
                <h4 className="font-semibold text-foreground mb-1">Consulting</h4>
                {previewData.consulting_check ? (
                  <div className="space-y-1 text-muted-foreground">
                    {previewData.consulting_with_whom && <p><span className="font-medium text-foreground">With:</span> {previewData.consulting_with_whom}</p>}
                    {previewData.consulting_case_studies && <p><span className="font-medium text-foreground">Case studies:</span> {previewData.consulting_case_studies}</p>}
                  </div>
                ) : (
                  <p className="text-muted-foreground italic">No consulting experience</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default CoBuilders;
