import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BarChart3, Briefcase, Laptop, Loader2, Package } from "lucide-react";
import type { OfferKind } from "@/lib/marketingIntelligence";

const OPTIONS: { kind: OfferKind; label: string; desc: string; Icon: typeof Package }[] = [
  { kind: "service", label: "Service", desc: "Workshops, training, consulting, delivery work", Icon: Briefcase },
  { kind: "digital_product", label: "Digital product", desc: "Software, SaaS, app, platform", Icon: Laptop },
  { kind: "product", label: "Product", desc: "Physical goods", Icon: Package },
];

export function MarketingIntelligenceButton({ orgId, productId, productName }: { orgId: string; productId: string; productName: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<OfferKind | null>(null);
  const [checking, setChecking] = useState(false);
  const { user } = useAuth();
  const { slug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const openLatest = async () => {
    if (!user || checking) return;
    setChecking(true);
    try {
      const { data, error } = await supabase
        .from("product_marketing_analyses")
        .select("id")
        .eq("organization_id", orgId)
        .eq("product_id", productId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        navigate(`/org/${slug}/marketing/${data.id}`);
      } else {
        setOpen(true);
      }
    } catch (error) {
      toast({ title: "Could not open saved analysis", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    } finally {
      setChecking(false);
    }
  };

  const create = async (kind: OfferKind) => {
    if (!user) return;
    setBusy(kind);
    const { data, error } = await supabase
      .from("product_marketing_analyses")
      .insert({ organization_id: orgId, product_id: productId, created_by: user.id, offer_kind: kind, title: productName })
      .select("id")
      .single();
    setBusy(null);
    if (error || !data) {
      toast({ title: "Could not create page", description: error?.message, variant: "destructive" });
      return;
    }
    setOpen(false);
    navigate(`/org/${slug}/marketing/${data.id}`);
  };

  return (
    <>
      <Button size="sm" variant="outline" disabled={checking || !!busy} onClick={(e) => { e.stopPropagation(); void openLatest(); }}>
        {checking ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <BarChart3 className="w-4 h-4 mr-1" />} Marketing Intelligence
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>What is "{productName}"?</DialogTitle>
            <DialogDescription>{productName}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            {OPTIONS.map(({ kind, label, desc, Icon }) => (
              <Button key={kind} type="button" variant="outline" disabled={!!busy} onClick={() => create(kind)}
                className="flex items-center gap-3 rounded-lg border border-border p-3 text-left hover:bg-muted disabled:opacity-60 min-h-[56px] h-auto whitespace-normal">
                <Icon className="w-5 h-5 text-primary shrink-0" />
                <span className="flex-1">
                  <span className="block font-semibold text-sm">{label}</span>
                  <span className="block text-xs text-muted-foreground">{desc}</span>
                </span>
                {busy === kind && <Loader2 className="w-4 h-4 animate-spin" />}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
