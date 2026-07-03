import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Rocket, ArrowLeft } from "lucide-react";

export default function BrandEntity() {
  return (
    <main className="container mx-auto max-w-3xl px-4 pt-24 pb-16 space-y-6">
      <header className="space-y-2">
        <Badge variant="outline" className="gap-1.5">
          <Rocket className="w-3 h-3" /> Brand Growth
        </Badge>
        <h1 className="text-3xl font-semibold tracking-tight">
          Launch your brand entity
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Pick a brand name (for example "AngryPenguin & Co"), co-own it with a
          strategic platform partner, and keep using the platform to manage your
          workload, splits and declarations.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Coming next</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            The brand entity flow is being finalized. Once available it will:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Create a new organization visible in <Link to="/organizations" className="underline">/organizations</Link>.</li>
            <li>Assign your default platform partner as associé 2.</li>
            <li>Link your declaration entity to the brand — ownership stays with you.</li>
            <li>Position you as Inspiring Advisor of the brand.</li>
          </ul>
          <Button asChild variant="outline" size="sm">
            <Link to="/consulting-growth">
              <ArrowLeft className="w-3 h-3 mr-1" /> Back to Consulting Growth
            </Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
