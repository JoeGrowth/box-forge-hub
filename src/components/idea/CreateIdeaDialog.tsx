import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, X, ArrowRight, AlertCircle, GraduationCap } from "lucide-react";

const SECTORS = [
  "Health", "Agriculture", "Education", "Food",
  "Technology", "Finance", "Environment", "Other",
];

interface CreateIdeaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateIdeaDialog = ({ open, onOpenChange }: CreateIdeaDialogProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sector, setSector] = useState("");
  const [rolesNeeded, setRolesNeeded] = useState<string[]>([]);
  const [newRole, setNewRole] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasInitiatorCert, setHasInitiatorCert] = useState<boolean | null>(null);
  const [checkingCert, setCheckingCert] = useState(true);

  useEffect(() => {
    if (!open || !user) return;
    const check = async () => {
      setCheckingCert(true);
      try {
        const { data, error } = await supabase
          .from("user_certifications")
          .select("id")
          .eq("user_id", user.id)
          .eq("certification_type", "initiator_b4")
          .maybeSingle();
        if (error) throw error;
        setHasInitiatorCert(!!data);
      } catch {
        setHasInitiatorCert(false);
      } finally {
        setCheckingCert(false);
      }
    };
    check();
  }, [open, user]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setSector("");
    setRolesNeeded([]);
    setNewRole("");
  };

  const addRole = () => {
    if (newRole.trim() && !rolesNeeded.includes(newRole.trim())) {
      setRolesNeeded([...rolesNeeded, newRole.trim()]);
      setNewRole("");
    }
  };

  const removeRole = (role: string) => {
    setRolesNeeded(rolesNeeded.filter((r) => r !== role));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast({ title: "Missing Information", description: "Please fill in the title and description.", variant: "destructive" });
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
      toast({ title: "Startup Idea Created!", description: "Your idea is now visible to other co-builders." });
      resetForm();
      onOpenChange(false);
      navigate("/opportunities");
    } catch (error) {
      console.error("Error creating idea:", error);
      toast({ title: "Error", description: "Failed to create startup idea. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Create Startup Idea</DialogTitle>
        </DialogHeader>

        {checkingCert ? (
          <div className="py-8 text-center text-muted-foreground animate-pulse">Checking certification...</div>
        ) : !hasInitiatorCert ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-7 h-7 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="font-display text-lg font-bold text-foreground mb-3">Certification Required</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              To create your own startup idea, you need to complete the <strong>"Be an Initiator"</strong> learning journey and earn your Initiator certification.
            </p>
            <div className="bg-muted/50 rounded-xl p-4 mb-4 text-left">
              <div className="flex items-center gap-2 mb-2">
                <GraduationCap className="w-4 h-4 text-secondary" />
                <h4 className="font-semibold text-sm text-foreground">Idea PTC Journey</h4>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Learn how to validate and structure your idea</li>
                <li>• Understand team building strategies</li>
                <li>• Prepare for a successful launch</li>
              </ul>
            </div>
            <Link to="/journey?section=initiator" onClick={() => onOpenChange(false)}>
              <Button size="sm">
                <GraduationCap className="w-4 h-4 mr-1" /> Start Initiator Journey
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="idea-title">Startup Title *</Label>
              <Input
                id="idea-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., HealthTrack - AI Health Monitoring"
                className="mt-1"
                maxLength={100}
              />
            </div>

            <div>
              <Label htmlFor="idea-description">Description *</Label>
              <Textarea
                id="idea-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your startup idea, the problem it solves, and your vision..."
                className="mt-1 min-h-[120px]"
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground mt-1">{description.length}/1000 characters</p>
            </div>

            <div>
              <Label htmlFor="idea-sector">Sector</Label>
              <select
                id="idea-sector"
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
              <p className="text-xs text-muted-foreground mb-2">What kind of co-builders are you looking for?</p>
              <div className="flex gap-2 mb-2">
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
                    <span key={role} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-secondary/10 text-secondary text-sm">
                      {role}
                      <button type="button" onClick={() => removeRole(role)} className="hover:text-destructive">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Startup Idea"}
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
