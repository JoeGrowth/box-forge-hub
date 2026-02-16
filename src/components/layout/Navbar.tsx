import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut, User, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserStatus } from "@/hooks/useUserStatus";
import { supabase } from "@/integrations/supabase/client";
import { NotificationBell } from "./NotificationBell";
import { ChatBell } from "./ChatBell";

// Links for logged-out users
const guestNavLinks = [
  { name: "About", path: "/about" },
  { name: "Programs", path: "/programs" },
  { name: "Join Us", path: "/join" },
  { name: "Boxes", path: "/boxes" },
];

// Helper to build links based on role and access
const getAppliedLinks = () => [
  { name: "Opportunities", path: "/opportunities" },
  { name: "People", path: "/cobuilders" },
  { name: "Track", path: "/track" },
];

const getApprovedLinks = (hideVaccines: boolean, hasConsultantAccess: boolean) => [
  ...getAppliedLinks(),
  ...(!hideVaccines ? [{ name: "Vaccines", path: "/journey" }] : []),
  ...(hasConsultantAccess ? [{ name: "Advisory", path: "/advisory" }] : []),
];

const getBoostedLinks = (hideVaccines: boolean, hasConsultantAccess: boolean) => [
  ...getAppliedLinks(),
  ...(!hideVaccines ? [{ name: "Vaccines", path: "/journey" }] : []),
  { name: "Scale", path: "/start" },
  ...(hasConsultantAccess ? [{ name: "Advisory", path: "/advisory" }] : []),
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [allVaccinesDone, setAllVaccinesDone] = useState(false);
  const [hasConsultantAccess, setHasConsultantAccess] = useState(false);
  const location = useLocation();
  const { user, signOut, loading } = useAuth();
  const { canAccessBoosting, canAccessScaling, potentialRole } = useUserStatus();

  useEffect(() => {
    const checkUserStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        setAllVaccinesDone(false);
        setHasConsultantAccess(false);
        return;
      }

      // Check admin role and certifications in parallel
      const [adminResult, certsResult, onboardingResult] = await Promise.all([
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle(),
        supabase
          .from("user_certifications")
          .select("certification_type")
          .eq("user_id", user.id)
          .in("certification_type", ["cobuilder_b4", "initiator_b4"]),
        supabase
          .from("onboarding_state")
          .select("consultant_access")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      setIsAdmin(!!adminResult.data);

      // Hide Vaccines tab if user has both cobuilder and initiator certifications
      const certTypes = (certsResult.data || []).map((c: any) => c.certification_type);
      setAllVaccinesDone(
        certTypes.includes("cobuilder_b4") && certTypes.includes("initiator_b4")
      );
      setHasConsultantAccess(!!onboardingResult.data?.consultant_access);
    };
    checkUserStatus();
  }, [user]);

  const navLinks = useMemo(() => {
    if (!user) return guestNavLinks;
    if (canAccessScaling) return getBoostedLinks(allVaccinesDone, hasConsultantAccess);
    if (canAccessBoosting) return getApprovedLinks(allVaccinesDone, hasConsultantAccess);
    return getAppliedLinks();
  }, [user, canAccessScaling, canAccessBoosting, allVaccinesDone, hasConsultantAccess]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">B4</span>
            </div>
            <span className="font-display font-bold text-xl text-foreground">Platform</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`text-sm font-medium transition-colors hover:text-b4-teal ${
                  location.pathname === link.path
                    ? "text-b4-teal"
                    : "text-muted-foreground"
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            {!loading && (
              user ? (
                <>
                  <ChatBell />
                  <NotificationBell />
                  {isAdmin && (
                    <Button variant="ghost" size="sm" asChild>
                      <Link to="/admin" className="flex items-center gap-2">
                        <Shield size={16} />
                        Admin
                      </Link>
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/profile" className="flex items-center gap-2">
                      <User size={16} />
                      <span className="max-w-[120px] truncate">{user.user_metadata?.full_name || user.email}</span>
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={async () => { await signOut(); }}>
                    <LogOut size={16} className="mr-1" />
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/login">Log In</Link>
                  </Button>
                  <Button variant="teal" size="sm" asChild>
                    <Link to="/auth?mode=signup">Get Started</Link>
                  </Button>
                </>
              )
            )}
          </div>

          {/* Mobile: Icons + Menu Button */}
          <div className="md:hidden flex items-center gap-1">
            {!loading && user && (
              <>
                <ChatBell />
                <NotificationBell />
              </>
            )}
            <button
              className="p-2 text-foreground"
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Toggle menu"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-border animate-fade-in">
            <div className="flex flex-col gap-3">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === link.path
                      ? "bg-muted text-b4-teal"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
              <div className="flex flex-col gap-2 px-4 pt-2">
                {!loading && (
                  user ? (
                    <>
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/profile" onClick={() => setIsOpen(false)}>
                          <User size={16} className="mr-1" />
                          Profile
                        </Link>
                      </Button>
                      <Button variant="ghost" size="sm" onClick={async () => { await signOut(); setIsOpen(false); }}>
                        <LogOut size={16} className="mr-1" />
                        Sign Out
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" size="sm" className="flex-1" asChild>
                        <Link to="/login" onClick={() => setIsOpen(false)}>Log In</Link>
                      </Button>
                      <Button variant="teal" size="sm" className="flex-1" asChild>
                        <Link to="/auth?mode=signup" onClick={() => setIsOpen(false)}>Get Started</Link>
                      </Button>
                    </>
                  )
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
