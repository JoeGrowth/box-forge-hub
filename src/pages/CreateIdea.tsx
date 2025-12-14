import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Lightbulb, 
  ArrowRight,
  ArrowLeft,
  Plus,
  X
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

const CreateIdea = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { onboardingState } = useOnboarding();
  const { toast } = useToast();
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sector, setSector] = useState("");
  const [rolesNeeded, setRolesNeeded] = useState<string[]>([]);
  const [newRole, setNewRole] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (onboardingState?.journey_status !== "approved") {
      navigate("/profile", { replace: true });
    }
  }, [onboardingState, navigate]);

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
      const { error } = await supabase.from("startup_ideas").insert({
        creator_id: user!.id,
        title: title.trim(),
        description: description.trim(),
        sector: sector || null,
        roles_needed: rolesNeeded.length > 0 ? rolesNeeded : null,
        status: "active",
        is_looking_for_cobuilders: true,
      });

      if (error) throw error;

      toast({
        title: "Startup Idea Created!",
        description: "Your idea is now visible to other co-builders.",
      });

      navigate("/opportunities");
    } catch (error) {
      console.error("Error creating idea:", error);
      toast({
        title: "Error",
        description: "Failed to create startup idea. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
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
              <Lightbulb className="w-8 h-8" />
              <h1 className="font-display text-3xl font-bold">Create Startup Idea</h1>
            </div>
            <p className="text-primary-foreground/80 max-w-2xl">
              As an Initiator, you can create your own startup idea and find co-builders to join your venture.
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
                {isSubmitting ? "Creating..." : "Create Startup Idea"}
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

export default CreateIdea;
