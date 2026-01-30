import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Briefcase, MapPin, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface Opportunity {
  id: string;
  title: string;
  sector: string | null;
  roles_needed: string[] | null;
  created_at: string;
}

export function DashboardOpportunities() {
  const { user } = useAuth();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [userSkills, setUserSkills] = useState<string[]>([]);

  useEffect(() => {
    const fetchOpportunities = async () => {
      if (!user) return;

      // Get user's skills/certifications
      const { data: profile } = await supabase
        .from("profiles")
        .select("primary_skills")
        .eq("user_id", user.id)
        .single();

      if (profile?.primary_skills) {
        setUserSkills(profile.primary_skills.split(",").map((s: string) => s.trim().toLowerCase()));
      }

      // Get recent opportunities
      const { data } = await supabase
        .from("startup_ideas")
        .select("id, title, sector, roles_needed, created_at")
        .eq("status", "active")
        .eq("is_looking_for_cobuilders", true)
        .order("created_at", { ascending: false })
        .limit(5);

      setOpportunities(data || []);
      setLoading(false);
    };

    fetchOpportunities();
  }, [user]);

  const isMatchingRole = (roles: string[] | null) => {
    if (!roles || !userSkills.length) return false;
    return roles.some((role) =>
      userSkills.some((skill) => role.toLowerCase().includes(skill))
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-b4-teal" />
            Latest Opportunities
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/opportunities">
              View All <ArrowRight className="ml-1 w-4 h-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : opportunities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Briefcase className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>No opportunities available right now</p>
            <p className="text-sm">Check back soon for new startups!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {opportunities.map((opp) => (
              <Link
                key={opp.id}
                to={`/opportunities/${opp.id}`}
                className="block p-4 rounded-lg border border-border hover:border-b4-teal/30 hover:bg-muted/30 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-foreground truncate">
                        {opp.title}
                      </h4>
                      {isMatchingRole(opp.roles_needed) && (
                        <Badge variant="secondary" className="bg-b4-teal/10 text-b4-teal text-xs">
                          Matches Your Skills
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {opp.sector && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {opp.sector}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(opp.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    {opp.roles_needed && opp.roles_needed.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {opp.roles_needed.slice(0, 3).map((role, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {role}
                          </Badge>
                        ))}
                        {opp.roles_needed.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{opp.roles_needed.length - 3} more
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
