import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrainTeamDialog } from "@/components/resume/TrainTeamDialog";
import { GraduationCap, Plus } from "lucide-react";

export default function PublishTraining() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);

  return (
    <div className="min-h-screen bg-background">
      <main className="pt-24 container mx-auto px-4 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Publish a Training</h1>
          <p className="text-muted-foreground mt-1">
            Submit a training. Once approved, it appears in the Opportunity Marketplace under Training.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <GraduationCap className="w-4 h-4 text-b4-teal" /> Submit a Training
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button onClick={() => setOpen(true)} className="gap-1.5">
              <Plus className="w-4 h-4" /> Open form
            </Button>
            <Button variant="outline" onClick={() => navigate("/opportunities?tab=training")}>
              View Training in Marketplace
            </Button>
          </CardContent>
        </Card>

        <TrainTeamDialog open={open} onOpenChange={setOpen} />
      </main>
    </div>
  );
}
