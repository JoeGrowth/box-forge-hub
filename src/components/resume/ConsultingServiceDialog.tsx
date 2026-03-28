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
import { Loader2, Briefcase } from "lucide-react";

interface ConsultingServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConsultingServiceDialog({ open, onOpenChange }: ConsultingServiceDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    service_type: "",
    target_clients: "",
    delivery_format: "",
    sector: "",
    pricing_model: "",
  });

  const handleSubmit = async () => {
    if (!user) return;
    if (!form.title.trim() || !form.description.trim()) {
      toast({ title: "Missing fields", description: "Title and description are required.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("consulting_service_proposals" as any).insert({
        user_id: user.id,
        title: form.title.trim(),
        description: form.description.trim(),
        service_type: form.service_type.trim() || null,
        target_clients: form.target_clients.trim() || null,
        delivery_format: form.delivery_format || null,
        sector: form.sector.trim() || null,
        pricing_model: form.pricing_model || null,
      } as any);

      if (error) throw error;

      toast({
        title: "Service Submitted",
        description: "Your consulting service has been submitted for admin review. It will appear in Opportunities once approved.",
      });

      setForm({ title: "", description: "", service_type: "", target_clients: "", delivery_format: "", sector: "", pricing_model: "" });
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to submit service.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-b4-teal" />
            Propose a Consulting Service
          </DialogTitle>
          <DialogDescription>
            Describe the consulting service you'd like to offer. Once approved by an admin, it will be published in Opportunities.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <Label htmlFor="service-title">Service Title *</Label>
            <Input
              id="service-title"
              placeholder="e.g. Strategic Business Consulting"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="service-description">Brief Description *</Label>
            <Textarea
              id="service-description"
              placeholder="What value do you deliver? What problems do you solve for clients?"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="service-type">Service Type</Label>
              <Input
                id="service-type"
                placeholder="e.g. Advisory, Audit, Coaching"
                value={form.service_type}
                onChange={(e) => setForm({ ...form, service_type: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="service-clients">Target Clients</Label>
              <Input
                id="service-clients"
                placeholder="e.g. SMEs, Startups, NGOs"
                value={form.target_clients}
                onChange={(e) => setForm({ ...form, target_clients: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Delivery Format</Label>
              <Select value={form.delivery_format} onValueChange={(v) => setForm({ ...form, delivery_format: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="on-site">On-site</SelectItem>
                  <SelectItem value="remote">Remote</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Pricing Model</Label>
              <Select value={form.pricing_model} onValueChange={(v) => setForm({ ...form, pricing_model: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="per-day">Per Day</SelectItem>
                  <SelectItem value="per-project">Per Project</SelectItem>
                  <SelectItem value="retainer">Retainer</SelectItem>
                  <SelectItem value="equity-based">Equity-based</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="service-sector">Sector</Label>
            <Input
              id="service-sector"
              placeholder="e.g. Technology, Finance, Agriculture"
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
