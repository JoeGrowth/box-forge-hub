import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";
import { useVerifiedAffiliations } from "@/hooks/useEntityRoleAssignments";

interface Props {
  userId: string | undefined;
}

export function VerifiedAffiliationsCard({ userId }: Props) {
  const { data: rows = [], isLoading } = useVerifiedAffiliations(userId);
  if (isLoading || rows.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-b4-teal" /> Verified affiliations
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {rows.map((r: any) => (
          <Badge key={r.id} variant="secondary" className="gap-1">
            {r.role_type} · {r.role_slug}
          </Badge>
        ))}
      </CardContent>
    </Card>
  );
}
