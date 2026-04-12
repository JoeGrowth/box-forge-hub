import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface CreateServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

export function CreateServiceDialog({ open, onOpenChange, onCreated }: CreateServiceDialogProps) {
  const { user } = useAuth();
  const [skillTags, setSkillTags] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [skillTagId, setSkillTagId] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [deliveryType, setDeliveryType] = useState("remote");
  const [availability, setAvailability] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!open) return;
    supabase.from("skill_tags").select("id, name").order("name").then(({ data }) => {
      if (data) setSkillTags(data);
    });
  }, [open]);

  const reset = () => {
    setTitle("");
    setSkillTagId("");
    setPrice("");
    setCurrency("USD");
    setDeliveryType("remote");
    setAvailability("");
    setDescription("");
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!title.trim()) { toast.error("Service title is required."); return; }
    if (!price || Number(price) < 0) { toast.error("Valid price is required."); return; }

    setLoading(true);
    const { error } = await (supabase.from("consulting_services" as any) as any).insert({
      user_id: user.id,
      service_title: title.trim(),
      skill_tag_id: skillTagId || null,
      price: Number(price),
      currency,
      delivery_type: deliveryType,
      availability: availability.trim() || null,
      description: description.trim() || null,
    });

    if (error) {
      toast.error("Failed to create service.");
    } else {
      toast.success("Service created.");
      reset();
      onOpenChange(false);
      onCreated?.();
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Service</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="svc-title">Service Title</Label>
            <Input id="svc-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="e.g. Strategic Business Advisory" />
          </div>
          <div>
            <Label htmlFor="svc-skill">Skill Tag</Label>
            <Select value={skillTagId} onValueChange={setSkillTagId}>
              <SelectTrigger id="svc-skill"><SelectValue placeholder="Select a skill" /></SelectTrigger>
              <SelectContent>
                {skillTags.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="svc-price">Price (per session/day)</Label>
              <Input id="svc-price" type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label htmlFor="svc-currency">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="svc-currency"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="TND">TND</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="svc-delivery">Delivery Type</Label>
            <Select value={deliveryType} onValueChange={setDeliveryType}>
              <SelectTrigger id="svc-delivery"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="remote">Remote</SelectItem>
                <SelectItem value="on-site">On-site</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="svc-avail">Availability</Label>
            <Input id="svc-avail" value={availability} onChange={(e) => setAvailability(e.target.value)} maxLength={100} placeholder="e.g. Weekdays, 2 slots/week" />
          </div>
          <div>
            <Label htmlFor="svc-desc">Description</Label>
            <Textarea id="svc-desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={3} placeholder="What does this service include?" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
