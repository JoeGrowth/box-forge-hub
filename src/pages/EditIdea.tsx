import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Edit, 
  ArrowRight,
  ArrowLeft,
  Plus,
  X,
  AlertCircle
} from "lucide-react";

const SECTORS = [
  "Health",
  "Agriculture", 
  "Education",
  "Food",
  "Technology",
  "Finance",
  "Environment",
  "Other"
];

const EditIdea = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sector, setSector] = useState("");
  const [rolesNeeded, setRolesNeeded] = useState<string[]>([]);
  const [newRole, setNewRole] = useState("");
  const [adminNotes, setAdminNotes] = useState<string | null>(null);
  const [reviewStatus, setReviewStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchIdea = async () => {
      if (!id || !user) return;

      const { data, error } = await supabase
        .from("startup_ideas")
        .select("*")
        .eq("id", id)
        .eq("creator_id", user.id)
        .maybeSingle();

      if (error || !data) {
        console.error("Error fetching idea:", error);
        setNotFound(true);
        setLoading(false);
        return;
      }

      setTitle(data.title);
      setDescription(data.description);
      setSector(data.sector || "");
      setRolesNeeded(data.roles_needed || []);
      setAdminNotes(data.admin_notes);
      setReviewStatus(data.review_status);
      setLoading(false);
    };

    fetchIdea();
  }, [id, user]);

  const addRole = () => {
    if (newRole.trim() && !rolesNeeded.includes(newRole.trim())) {
      setRolesNeeded([...rolesNeeded, newRole.trim()]);
      setNewRole("");
    }
  };

  const removeRole = (role: string) => {
    setRolesNeeded(rolesNeeded.filter(r => r !== role));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !description.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in the title and description.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("startup_ideas")
        .update({
          title: title.trim(),
          description: description.trim(),
          sector: sector || null,
          roles_needed: rolesNeeded.length > 0 ? rolesNeeded : null,
          review_status: "pending", // Reset to pending after enhancement
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("creator_id", user!.id);

      if (error) throw error;

      // Create admin notification about resubmission
      await supabase.from("admin_notifications").insert({
        user_id: user!.id,
        notification_type: "opportunity_resubmitted",
        user_name: null, // Will be filled by admin when viewing
        message: `Opportunity "${title}" has been enhanced and resubmitted for review.`,
      });

      toast({
        title: "Idea Updated!",
        description: "Your idea has been resubmitted for review.",
      });

      navigate("/profile");
    } catch (error) {
      console.error("Error updating idea:", error);
      toast({
        title: "Error",
        description: "Failed to update startup idea. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-20">
          <div className="container mx-auto px-4 py-16 text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h1 className="font-display text-2xl font-bold text-foreground mb-2">
              Idea Not Found
            </h1>
            <p className="text-muted-foreground mb-6">
              The idea you're looking for doesn't exist or you don't have permission to edit it.
            </p>
            <Button variant="outline" onClick={() => navigate("/profile")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Profile
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-20">
        {/* Header */}
        <section className="py-12 gradient-hero text-primary-foreground">
          <div className="container mx-auto px-4">
            <div className="flex items-center gap-3 mb-2">
              <Edit className="w-8 h-8" />
              <h1 className="font-display text-3xl font-bold">Edit Startup Idea</h1>
            </div>
            <p className="text-primary-foreground/80 max-w-2xl">
              Update your startup idea based on the feedback received.
            </p>
          </div>
        </section>

        {/* Form */}
        <section className="py-12">
          <div className="container mx-auto px-4 max-w-2xl">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/profile")}
              className="mb-6"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Profile
            </Button>

            {/* Admin Feedback */}
            {reviewStatus === "needs_enhancement" && (
              <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-amber-600 mb-1">Enhancement Requested</h3>
                    <p className="text-sm text-foreground/80">
                      Please review and enhance your idea based on the following feedback:
                    </p>
                    {adminNotes && (
                      <p className="mt-2 text-sm text-foreground bg-background/50 p-3 rounded-lg">
                        {adminNotes}
                      </p>
                    )}
                    {!adminNotes && (
                      <p className="mt-2 text-sm text-muted-foreground italic">
                        No specific notes provided. Please improve the clarity and detail of your submission.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-card rounded-2xl border border-border p-8">
                <h2 className="font-display text-xl font-bold text-foreground mb-6">
                  Startup Details
                </h2>

                <div className="space-y-6">
                  <div>
                    <Label htmlFor="title">Startup Title *</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., HealthTrack - AI Health Monitoring"
                      className="mt-1"
                      maxLength={100}
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe your startup idea, the problem it solves, and your vision..."
                      className="mt-1 min-h-[150px]"
                      maxLength={1000}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {description.length}/1000 characters
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="sector">Sector</Label>
                    <select
                      id="sector"
                      value={sector}
                      onChange={(e) => setSector(e.target.value)}
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Select a sector</option>
                      {SECTORS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label>Roles Needed</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      What kind of co-builders are you looking for?
                    </p>
                    
                    <div className="flex gap-2 mb-3">
                      <Input
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value)}
                        placeholder="e.g., Marketing Lead, Developer"
                        onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addRole())}
                      />
                      <Button type="button" variant="outline" onClick={addRole}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>

                    {rolesNeeded.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {rolesNeeded.map((role) => (
                          <span
                            key={role}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-b4-teal/10 text-b4-teal text-sm"
                          >
                            {role}
                            <button
                              type="button"
                              onClick={() => removeRole(role)}
                              className="hover:text-b4-coral"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                variant="teal"
                size="lg"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Resubmit for Review"}
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </form>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default EditIdea;
