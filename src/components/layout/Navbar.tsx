import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Menu, X, LogOut, User, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLearningJourneys } from "@/hooks/useLearningJourneys";
import { useUserStatus } from "@/hooks/useUserStatus";
import { supabase } from "@/integrations/supabase/client";
import { NotificationBell } from "./NotificationBell";

// Links for logged-out users
const guestNavLinks = [
  { name: "About", path: "/about" },
  { name: "Programs", path: "/programs" },
  { name: "Join Us", path: "/join" },
  { name: "Boxes", path: "/boxes" },
];

// Base links for all logged-in users (applied status)
const appliedUserLinks = [
  { name: "Opportunities", path: "/opportunities" },
  { name: "People", path: "/cobuilders" },
];

// Links for approved users (includes Boosting)
const approvedUserLinks = [
  { name: "Opportunities", path: "/opportunities" },
  { name: "People", path: "/cobuilders" },
  { name: "Resume", path: "/resume" },
  { name: "Boost", path: "/journey" },
];

// Links for boosted/scaled users (includes Scale)
const boostedUserLinks = [
  { name: "Opportunities", path: "/opportunities" },
  { name: "People", path: "/cobuilders" },
  { name: "Resume", path: "/resume" },
  { name: "Boost", path: "/journey" },
  { name: "Scale", path: "/start" },
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const location = useLocation();
  const { user, signOut, loading } = useAuth();
  const { journeys } = useLearningJourneys();
  const { canAccessBoosting, canAccessScaling } = useUserStatus();

  // Count journeys in progress
  const journeysInProgress = journeys.filter(j => j.status === "in_progress").length;

  useEffect(() => {
    const checkUserStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }

      // Check admin role
      const { data: adminData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!adminData);
    };
    checkUserStatus();
  }, [user]);

  // Build nav links based on authentication and user status
  const getNavLinks = () => {
    if (!user) return guestNavLinks;
    
    // Boosted or scaled users get Scale page
    if (canAccessScaling) return boostedUserLinks;
    
    // Approved users get Boosting page (but not Scale)
    if (canAccessBoosting) return approvedUserLinks;
    
    // Applied users (default for logged-in)
    return appliedUserLinks;
  };

  const navLinks = getNavLinks();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-semibold text-sm">B4</span>
            </div>
            <span className="font-semibold text-foreground">Platform</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname === link.path
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                {link.name}
                {link.name === "Boost" && user && journeysInProgress > 0 && (
                  <Badge className="ml-1.5 bg-primary text-primary-foreground text-xs px-1.5 py-0 min-w-[18px] h-[18px]">
                    {journeysInProgress}
                  </Badge>
                )}
              </Link>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-2">
            {!loading && (
              user ? (
                <>
                  <NotificationBell />
                  {isAdmin && (
                    <Button variant="ghost" size="sm" asChild>
                      <Link to="/admin" className="flex items-center gap-1.5">
                        <Shield size={16} />
                        Admin
                      </Link>
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/profile" className="flex items-center gap-1.5">
                      <User size={16} />
                      <span className="max-w-[100px] truncate">{user.user_metadata?.full_name || user.email}</span>
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" onClick={async () => { await signOut(); }}>
                    <LogOut size={16} />
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/login">Log In</Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link to="/auth?mode=signup">Get Started</Link>
                  </Button>
                </>
              )
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-foreground rounded-md hover:bg-accent"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname === link.path
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:bg-accent"
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  {link.name}
                  {link.name === "Boost" && user && journeysInProgress > 0 && (
                    <Badge className="ml-1.5 bg-primary text-primary-foreground text-xs px-1.5 py-0">
                      {journeysInProgress}
                    </Badge>
                  )}
                </Link>
              ))}
              <div className="flex flex-col gap-2 px-3 pt-4 border-t border-border mt-2">
                {!loading && (
                  user ? (
                    <>
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/profile" onClick={() => setIsOpen(false)}>
                          <User size={16} className="mr-1.5" />
                          Profile
                        </Link>
                      </Button>
                      <Button variant="ghost" size="sm" onClick={async () => { await signOut(); setIsOpen(false); }}>
                        <LogOut size={16} className="mr-1.5" />
                        Sign Out
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/login" onClick={() => setIsOpen(false)}>Log In</Link>
                      </Button>
                      <Button size="sm" asChild>
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
