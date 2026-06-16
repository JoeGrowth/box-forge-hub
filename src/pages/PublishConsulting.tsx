import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreateServiceDialog } from "@/components/consulting/CreateServiceDialog";
import { Handshake, Plus } from "lucide-react";

export default function PublishConsulting() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!open) {
      // No-op; stay on page so user can re-open or navigate away.
    }
  }, [open]);

  return (
    <div className="min-h-screen bg-background">
      <main className="pt-24 container mx-auto px-4 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Publish a Consulting Opportunity</h1>
          <p className="text-muted-foreground mt-1">
            Create a service. Once submitted, it appears in the Opportunity Marketplace under Consulting.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Handshake className="w-4 h-4 text-b4-teal" /> Create a Service
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button onClick={() => setOpen(true)} className="gap-1.5">
              <Plus className="w-4 h-4" /> Open form
            </Button>
            <Button variant="outline" onClick={() => navigate("/opportunities?tab=consulting")}>
              View Consulting in Marketplace
            </Button>
          </CardContent>
        </Card>

        <CreateServiceDialog
          open={open}
          onOpenChange={setOpen}
          onCreated={() => navigate("/opportunities?tab=consulting")}
        />
      </main>
    </div>
  );
}
