import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, GraduationCap } from "lucide-react";

interface TrainTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TrainTeamDialog({ open, onOpenChange }: TrainTeamDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    target_audience: "",
    duration: "",
    format: "",
    sector: "",
  });

  const handleSubmit = async () => {
    if (!user) return;
    if (!form.title.trim() || !form.description.trim()) {
      toast({ title: "Missing fields", description: "Title and description are required.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("training_opportunities" as any).insert({
        user_id: user.id,
        title: form.title.trim(),
        description: form.description.trim(),
        target_audience: form.target_audience.trim() || null,
        duration: form.duration.trim() || null,
        format: form.format || null,
        sector: form.sector.trim() || null,
      } as any);

      if (error) throw error;

      toast({
        title: "Training Submitted",
        description: "Your training has been submitted for admin review. It will appear in Opportunities once approved.",
      });

      setForm({ title: "", description: "", target_audience: "", duration: "", format: "", sector: "" });
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to submit training.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-b4-teal" />
            Submit a Training
          </DialogTitle>
          <DialogDescription>
            Describe the training you'd like to offer. Once approved by an admin, it will be published in Opportunities.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <Label htmlFor="training-title">Training Title *</Label>
            <Input
              id="training-title"
              placeholder="e.g. Leadership for Startup Teams"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="training-description">Brief Description *</Label>
            <Textarea
              id="training-description"
              placeholder="What will participants learn? What problems does this training solve?"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
            />
          </div>

          <div>
            <Label htmlFor="training-audience">Target Audience</Label>
            <Input
              id="training-audience"
              placeholder="e.g. Early-stage founders, Co-builders"
              value={form.target_audience}
              onChange={(e) => setForm({ ...form, target_audience: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="training-duration">Duration</Label>
              <Input
                id="training-duration"
                placeholder="e.g. 2 days, 4 hours"
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
              />
            </div>
            <div>
              <Label>Format</Label>
              <Select value={form.format} onValueChange={(v) => setForm({ ...form, format: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in-person">In Person</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="training-sector">Sector</Label>
            <Input
              id="training-sector"
              placeholder="e.g. Technology, Health, Agriculture"
              value={form.sector}
              onChange={(e) => setForm({ ...form, sector: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button variant="teal" onClick={handleSubmit} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Submit for Review
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
