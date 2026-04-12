import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, MapPin, Monitor, Send, Check } from "lucide-react";
import { toast } from "sonner";

interface Service {
  id: string;
  user_id: string;
  service_title: string;
  skill_tag_id: string | null;
  price: number;
  currency: string;
  delivery_type: string;
  availability: string | null;
  description: string | null;
  skill_tag_name?: string;
  provider_name?: string;
}

const deliveryIcons: Record<string, typeof Monitor> = {
  remote: Monitor,
  "on-site": MapPin,
  both: Monitor,
};

export function ServiceListing({ refreshKey }: { refreshKey?: number }) {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());
  const [requestDialog, setRequestDialog] = useState<Service | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchServices = async () => {
    setLoading(true);
    const { data: servicesData } = await (supabase.from("consulting_services" as any) as any)
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (!servicesData || servicesData.length === 0) {
      setServices([]);
      setLoading(false);
      return;
    }

    // Fetch skill tag names and provider names
    const skillTagIds = [...new Set(servicesData.map((s: any) => s.skill_tag_id).filter(Boolean))];
    const userIds = [...new Set(servicesData.map((s: any) => s.user_id))];

    const [skillRes, profileRes] = await Promise.all([
      skillTagIds.length > 0
        ? supabase.from("skill_tags").select("id, name").in("id", skillTagIds)
        : { data: [] },
      userIds.length > 0
        ? supabase.from("profiles").select("user_id, full_name").in("user_id", userIds)
        : { data: [] },
    ]);

    const skillMap = new Map((skillRes.data || []).map((s: any) => [s.id, s.name]));
    const profileMap = new Map((profileRes.data || []).map((p: any) => [p.user_id, p.full_name]));

    const enriched: Service[] = servicesData.map((s: any) => ({
      ...s,
      skill_tag_name: skillMap.get(s.skill_tag_id) || null,
      provider_name: profileMap.get(s.user_id) || "Unknown",
    }));

    setServices(enriched);

    // Check which services the user already requested
    if (user) {
      const { data: reqs } = await (supabase.from("service_requests" as any) as any)
        .select("service_id")
        .eq("requester_id", user.id);
      if (reqs) {
        setRequestedIds(new Set(reqs.map((r: any) => r.service_id)));
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchServices();
  }, [user, refreshKey]);

  const handleRequest = async () => {
    if (!user || !requestDialog) return;
    setSubmitting(true);

    const { error } = await (supabase.from("service_requests" as any) as any).insert({
      service_id: requestDialog.id,
      requester_id: user.id,
      message: message.trim() || null,
    });

    if (error) {
      if (error.code === "23505") {
        toast.info("Already requested.");
        setRequestedIds((prev) => new Set(prev).add(requestDialog.id));
      } else {
        toast.error("Request failed.");
      }
    } else {
      toast.success("Request sent.");
      setRequestedIds((prev) => new Set(prev).add(requestDialog.id));
    }
    setSubmitting(false);
    setRequestDialog(null);
    setMessage("");
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No services listed yet.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {services.map((svc) => {
          const isOwn = svc.user_id === user?.id;
          const isRequested = requestedIds.has(svc.id);
          const DeliveryIcon = deliveryIcons[svc.delivery_type] || Monitor;

          return (
            <div key={svc.id} className="rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-colors">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="font-display text-base font-semibold text-foreground leading-tight">{svc.service_title}</h3>
                <span className="shrink-0 font-bold text-foreground">
                  {svc.price > 0 ? `${svc.price} ${svc.currency}` : "Free"}
                </span>
              </div>

              {svc.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{svc.description}</p>
              )}

              <div className="flex flex-wrap gap-2 mb-3">
                {svc.skill_tag_name && (
                  <Badge variant="secondary" className="text-xs">{svc.skill_tag_name}</Badge>
                )}
                <Badge variant="outline" className="text-xs gap-1">
                  <DeliveryIcon className="w-3 h-3" />
                  {svc.delivery_type}
                </Badge>
                {svc.availability && (
                  <Badge variant="outline" className="text-xs">{svc.availability}</Badge>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <span className="text-xs text-muted-foreground">{svc.provider_name}</span>
                {isOwn ? (
                  <span className="text-xs text-muted-foreground">Your service</span>
                ) : isRequested ? (
                  <Button size="sm" variant="outline" disabled>
                    <Check className="w-3 h-3 mr-1" /> Requested
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => setRequestDialog(svc)}>
                    <Send className="w-3 h-3 mr-1" /> Request Service
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!requestDialog} onOpenChange={(o) => !o && setRequestDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request: {requestDialog?.service_title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Textarea
              placeholder="Describe your need (optional)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">The provider will be notified and can follow up with you.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestDialog(null)} disabled={submitting}>Cancel</Button>
            <Button onClick={handleRequest} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
