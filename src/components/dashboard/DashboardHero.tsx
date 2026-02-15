import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export function DashboardHero() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<{ full_name: string | null } | null>(null);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .single();
      setProfile(data);
    };
    fetchProfile();
  }, [user]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const firstName = profile?.full_name?.split(" ")[0] || "Builder";

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-b4-navy via-b4-navy/95 to-b4-navy/90 p-8 md:p-10">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-b4-teal/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-b4-coral/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-b4-teal" />
            <span className="text-b4-teal text-sm font-medium">
              {format(new Date(), "EEEE, MMMM d")}
            </span>
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-white mb-2">
            {getGreeting()}, {firstName}! 👋
          </h1>
          <p className="text-white/70 max-w-lg">
            Your startup journey continues. Check your progress and discover new opportunities waiting for you.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            className="bg-b4-teal hover:bg-b4-teal/90 text-white"
            asChild
          >
            <Link to="/opportunities">
              Explore Opportunities <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </Button>
          <Button 
            className="bg-b4-teal hover:bg-b4-teal/90 text-white"
            asChild
          >
            <Link to="/cobuilders">
              Co-Builders <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
