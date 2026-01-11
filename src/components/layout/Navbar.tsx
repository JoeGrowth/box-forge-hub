import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Menu, X, LogOut, User, Shield, Lock } from "lucide-react";
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
  { name: "Home", path: "/" },
  { name: "Opportunities", path: "/opportunities" },
  { name: "Co Builders", path: "/cobuilders" },
  { name: "Boxes", path: "/boxes" },
];

// Links for approved users (includes Boosting)
const approvedUserLinks = [
  { name: "Home", path: "/" },
  { name: "Opportunities", path: "/opportunities" },
  { name: "Co Builders", path: "/cobuilders" },
  { name: "Boosting", path: "/journey" },
  { name: "Mask", path: "/mask" },
  { name: "Boxes", path: "/boxes" },
];

// Links for boosted/scaled users (includes Scale)
const boostedUserLinks = [
  { name: "Home", path: "/" },
  { name: "Opportunities", path: "/opportunities" },
  { name: "Co Builders", path: "/cobuilders" },
  { name: "Boosting", path: "/journey" },
  { name: "Scale", path: "/scale" },
  { name: "Boxes", path: "/boxes" },
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const location = useLocation();
  const { user, signOut, loading } = useAuth();
  const { journeys } = useLearningJourneys();
  const { userStatus, canAccessBoosting, canAccessScaling, loading: statusLoading } = useUserStatus();

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
                className={`text-sm font-medium transition-colors hover:text-b4-teal flex items-center gap-1.5 ${
                  location.pathname === link.path
                    ? "text-b4-teal"
                    : "text-muted-foreground"
                }`}
              >
                {link.name}
                {link.name === "Boosting" && user && journeysInProgress > 0 && (
                  <Badge className="bg-b4-teal text-white text-xs px-1.5 py-0 min-w-[18px] h-[18px] flex items-center justify-center">
                    {journeysInProgress}
                  </Badge>
                )}
              </Link>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            {!loading && (
              user ? (
                <>
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

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-foreground"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-border animate-fade-in">
            <div className="flex flex-col gap-3">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                    location.pathname === link.path
                      ? "bg-muted text-b4-teal"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  {link.name}
                  {link.name === "Boosting" && user && journeysInProgress > 0 && (
                    <Badge className="bg-b4-teal text-white text-xs px-1.5 py-0 min-w-[18px] h-[18px] flex items-center justify-center">
                      {journeysInProgress}
                    </Badge>
                  )}
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
