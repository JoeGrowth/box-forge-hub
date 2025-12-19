import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Search, User, Briefcase, Loader2, Pencil, Check, X, ShieldCheck, Award } from "lucide-react";
import { toast } from "sonner";

interface Certification {
  id: string;
  user_id: string;
  certification_type: string;
  display_label: string;
  verified: boolean;
}

interface CoBuilder {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  primary_skills: string | null;
  natural_role_description: string | null;
  certifications: Certification[];
}

const CoBuilders = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [cobuilders, setCobuilders] = useState<CoBuilder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isApproved, setIsApproved] = useState(false);
  const [editingSkills, setEditingSkills] = useState(false);
  const [skillsInput, setSkillsInput] = useState("");
  const [savingSkills, setSavingSkills] = useState(false);

  // Check if user is an approved co-builder or entrepreneur
  useEffect(() => {
    const checkApprovalStatus = async () => {
      if (!user) {
        setIsApproved(false);
        return;
      }

      const { data } = await supabase
        .from("onboarding_state")
        .select("journey_status")
        .eq("user_id", user.id)
        .maybeSingle();

      const approved = data?.journey_status === "approved" || 
                       data?.journey_status === "entrepreneur_approved";
      setIsApproved(approved);
    };

    checkApprovalStatus();
  }, [user]);

  // Fetch approved co-builders
  useEffect(() => {
    const fetchCoBuilders = async () => {
      if (!isApproved) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Get approved co-builders
        const { data: onboardingData, error: onboardingError } = await supabase
          .from("onboarding_state")
          .select("user_id")
          .in("journey_status", ["approved", "entrepreneur_approved"]);

        if (onboardingError) throw onboardingError;

        const approvedUserIds = onboardingData?.map(o => o.user_id) || [];

        if (approvedUserIds.length === 0) {
          setCobuilders([]);
          setLoading(false);
          return;
        }

        // Get profiles for approved users
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, user_id, full_name, avatar_url, primary_skills")
          .in("user_id", approvedUserIds);

        if (profilesError) throw profilesError;

        // Get natural roles for these users
        const { data: naturalRoles, error: rolesError } = await supabase
          .from("natural_roles")
          .select("user_id, description")
          .in("user_id", approvedUserIds);

        if (rolesError) throw rolesError;

        // Get certifications for these users
        const { data: certifications, error: certsError } = await supabase
          .from("user_certifications")
          .select("id, user_id, certification_type, display_label, verified")
          .in("user_id", approvedUserIds);

        if (certsError) throw certsError;

        // Combine data
        const combinedData: CoBuilder[] = (profiles || []).map(profile => {
          const naturalRole = naturalRoles?.find(nr => nr.user_id === profile.user_id);
          const userCerts = certifications?.filter(c => c.user_id === profile.user_id) || [];
          return {
            ...profile,
            natural_role_description: naturalRole?.description || null,
            certifications: userCerts,
          };
        });

        // Sort to put current user first
        combinedData.sort((a, b) => {
          if (a.user_id === user?.id) return -1;
          if (b.user_id === user?.id) return 1;
          return 0;
        });

        setCobuilders(combinedData);

        // Set initial skills input for current user
        const currentUserProfile = combinedData.find(cb => cb.user_id === user?.id);
        if (currentUserProfile) {
          setSkillsInput(currentUserProfile.primary_skills || "");
        }
      } catch (error) {
        console.error("Error fetching co-builders:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCoBuilders();
  }, [isApproved, user?.id]);

  const handleSaveSkills = async () => {
    if (!user) return;
    
    setSavingSkills(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ primary_skills: skillsInput })
        .eq("user_id", user.id);

      if (error) throw error;

      // Update local state
      setCobuilders(prev => prev.map(cb => 
        cb.user_id === user.id 
          ? { ...cb, primary_skills: skillsInput }
          : cb
      ));
      
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
    const currentUserProfile = cobuilders.find(cb => cb.user_id === user?.id);
    setSkillsInput(currentUserProfile?.primary_skills || "");
    setEditingSkills(false);
  };

  // Filter co-builders based on search
  const filteredCobuilders = cobuilders.filter(cb => {
    const searchLower = searchQuery.toLowerCase();
    const nameMatch = cb.full_name?.toLowerCase().includes(searchLower);
    const skillsMatch = cb.primary_skills?.toLowerCase().includes(searchLower);
    const roleMatch = cb.natural_role_description?.toLowerCase().includes(searchLower);
    return nameMatch || skillsMatch || roleMatch;
  });

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const parseSkills = (skills: string | null): string[] => {
    if (!skills) return [];
    return skills.split(",").map(s => s.trim()).filter(s => s.length > 0);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-b4-teal" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-20">
          <section className="py-16">
            <div className="container mx-auto px-4 text-center">
              <h1 className="font-display text-3xl font-bold text-foreground mb-4">
                Co-Builders Directory
              </h1>
              <p className="text-muted-foreground mb-8">
                Please log in to access the co-builders directory.
              </p>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    );
  }

  if (!isApproved) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-20">
          <section className="py-16">
            <div className="container mx-auto px-4 text-center">
              <h1 className="font-display text-3xl font-bold text-foreground mb-4">
                Co-Builders Directory
              </h1>
              <p className="text-muted-foreground mb-8">
                This directory is only available to approved co-builders and entrepreneurs.
              </p>
              <p className="text-sm text-muted-foreground">
                Complete your co-builder journey and get approved to access this feature.
              </p>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-20">
        {/* Hero Section */}
        <section className="py-12 bg-gradient-to-br from-b4-teal/10 to-b4-navy/10">
          <div className="container mx-auto px-4">
            <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
              Co-Builders Directory
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Discover talented co-builders with the skills and natural roles that match your startup needs.
            </p>
          </div>
        </section>

        {/* Search and Filter */}
        <section className="py-8 border-b border-border">
          <div className="container mx-auto px-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search by name, skills, or natural role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </section>

        {/* Co-Builders Grid */}
        <section className="py-12">
          <div className="container mx-auto px-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-b4-teal" />
              </div>
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
                  
                  return (
                    <div
                      key={cobuilder.id}
                      className={`rounded-2xl border p-6 transition-colors ${
                        isCurrentUser 
                          ? "bg-b4-teal/5 border-b4-teal ring-2 ring-b4-teal/20" 
                          : "bg-card border-border hover:border-b4-teal/50"
                      }`}
                    >
                      {/* Current User Badge */}
                      {isCurrentUser && (
                        <div className="mb-3">
                          <Badge className="bg-b4-teal text-white">You</Badge>
                        </div>
                      )}

                      {/* Avatar and Name */}
                      <div className="flex items-center gap-4 mb-4">
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center font-semibold text-lg ${
                          isCurrentUser 
                            ? "bg-b4-teal text-white" 
                            : "bg-b4-teal/10 text-b4-teal"
                        }`}>
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
                            {cobuilder.certifications.some(c => c.verified) && (
                              <span title="Verified Co-Builder">
                                <ShieldCheck className="w-4 h-4 text-b4-teal" />
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span className="text-sm text-muted-foreground">Approved Co-Builder</span>
                            {cobuilder.certifications.map((cert) => (
                              <Badge 
                                key={cert.id}
                                className="bg-gradient-to-r from-b4-teal to-b4-purple text-white text-xs py-0 px-2"
                              >
                                <Award className="w-3 h-3 mr-1" />
                                {cert.display_label}
                              </Badge>
                            ))}
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
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelEdit}
                                disabled={savingSkills}
                              >
                                <X className="w-3.5 h-3.5" />
                                <span className="ml-1">Cancel</span>
                              </Button>
                            </div>
                          </div>
                        ) : cobuilder.primary_skills ? (
                          <div className="flex flex-wrap gap-2">
                            {parseSkills(cobuilder.primary_skills).slice(0, 5).map((skill, idx) => (
                              <Badge 
                                key={idx} 
                                variant="secondary"
                                className="bg-b4-teal/10 text-b4-teal border-none"
                              >
                                {skill}
                              </Badge>
                            ))}
                            {parseSkills(cobuilder.primary_skills).length > 5 && (
                              <Badge variant="outline" className="text-muted-foreground">
                                +{parseSkills(cobuilder.primary_skills).length - 5} more
                              </Badge>
                            )}
                          </div>
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
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default CoBuilders;
