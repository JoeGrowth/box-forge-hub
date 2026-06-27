import { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Menu,
  X,
  LogOut,
  User,
  Shield,
  ChevronDown,
  Briefcase,
  Lightbulb,
  Handshake,
  Plus,
  GraduationCap,
  FileText,
  Rocket,
  MoreHorizontal,
  Package,
  BookOpen,
  Compass,
  Building2,
  Sparkles,
  ListChecks,
  Activity,
  BarChart3,
} from "lucide-react";
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

const engineLinks = [
  { name: "Career", path: "/career", icon: Briefcase },
  { name: "Consulting", path: "/consulting", icon: Handshake },
  { name: "Entrepreneurship", path: "/entrepreneurship", icon: Lightbulb },
];

const publishLinks = [
  { name: "Recruiting", path: "/publish-job", icon: Briefcase, desc: "Offer a job" },
  { name: "Consulting", path: "/publish-consulting", icon: Handshake, desc: "Create a service" },
  { name: "Startup Idea", path: "/create-idea", icon: Lightbulb, desc: "Launch a venture" },
  { name: "Training", path: "/publish-training", icon: GraduationCap, desc: "Submit a training" },
  { name: "Procuring", path: "/procuring", icon: FileText, desc: "Post a tender" },
];

const moreLinks = [
  { name: "Boxes", path: "/boxes", icon: Package },
  { name: "Programs", path: "/programs", icon: BookOpen },
  { name: "Advisory", path: "/advisory", icon: Compass },
  { name: "Organizations", path: "/organizations", icon: Building2 },
  { name: "Brand Identity", path: "/brand-identity", icon: Sparkles },
  { name: "Track", path: "/track", icon: Activity },
  { name: "Checklist", path: "/checklist", icon: ListChecks },
  { name: "Ops", path: "/opsmanagement", icon: Building2 },
  { name: "Structuring", path: "/3S", icon: BarChart3 },
  { name: "Declaration", path: "/declaration", icon: FileText },
  { name: "Distribution per Consulting Mission", path: "/consultingmanagement", icon: Handshake },
  { name: "Distribution per Training Mission", path: "/trainingmanagement", icon: GraduationCap },
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [engineOpen, setEngineOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const location = useLocation();
  const { user, signOut, loading } = useAuth();
  const { canAccessBoosting, canAccessScaling, potentialRole } = useUserStatus();

  useEffect(() => {
    const checkUserStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }

      const adminResult = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      setIsAdmin(!!adminResult.data);
    };
    checkUserStatus();
  }, [user]);

  const isEngineActive = useMemo(() => engineLinks.some((l) => location.pathname === l.path), [location.pathname]);

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
            {!user ? (
              guestNavLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`text-sm font-medium transition-colors hover:text-b4-teal ${
                    location.pathname === link.path ? "text-b4-teal" : "text-muted-foreground"
                  }`}
                >
                  {link.name}
                </Link>
              ))
            ) : (
              <>
                <DropdownMenu open={engineOpen} onOpenChange={setEngineOpen}>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={`flex items-center gap-1 text-sm font-medium transition-colors hover:text-b4-teal outline-none ${
                        isEngineActive ? "text-b4-teal" : "text-muted-foreground"
                      }`}
                    >
                      Engine
                      <ChevronDown
                        size={14}
                        className={`transition-transform duration-200 ${engineOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="w-48 mt-2">
                    {engineLinks.map((link) => {
                      const Icon = link.icon;
                      return (
                        <DropdownMenuItem key={link.path} asChild>
                          <Link
                            to={link.path}
                            className={`flex items-center gap-2 cursor-pointer ${
                              location.pathname === link.path ? "text-b4-teal" : "text-foreground"
                            }`}
                          >
                            <Icon size={16} />
                            {link.name}
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Link
                  to="/opportunities"
                  className={`text-sm font-medium transition-colors hover:text-b4-teal ${
                    location.pathname === "/opportunities" ? "text-b4-teal" : "text-muted-foreground"
                  }`}
                >
                  Opportunities
                </Link>

                <DropdownMenu open={publishOpen} onOpenChange={setPublishOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="teal" size="sm" className="gap-1">
                      <Plus size={14} />
                      Publish
                      <ChevronDown
                        size={14}
                        className={`transition-transform duration-200 ${publishOpen ? "rotate-180" : ""}`}
                      />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 mt-2">
                    {publishLinks.map((link) => {
                      const Icon = link.icon;
                      return (
                        <DropdownMenuItem key={link.path} asChild>
                          <Link to={link.path} className="flex items-start gap-3 cursor-pointer py-2">
                            <Icon size={18} className="mt-0.5 text-b4-teal shrink-0" />
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-foreground">{link.name}</span>
                              <span className="text-xs text-muted-foreground">{link.desc}</span>
                            </div>
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu open={moreOpen} onOpenChange={setMoreOpen}>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-b4-teal outline-none"
                      aria-label="More"
                    >
                      <MoreHorizontal size={18} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 mt-2">
                    {moreLinks.map((link) => {
                      const Icon = link.icon;
                      return (
                        <DropdownMenuItem key={link.path} asChild>
                          <Link
                            to={link.path}
                            className={`flex items-center gap-2 cursor-pointer ${
                              location.pathname === link.path ? "text-b4-teal" : "text-foreground"
                            }`}
                          >
                            <Icon size={16} />
                            {link.name}
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            {!loading &&
              (user ? (
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      await signOut();
                    }}
                  >
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
              ))}
          </div>

          {/* Mobile: Icons + Menu Button */}
          <div className="md:hidden flex items-center gap-1">
            {!loading && user && (
              <>
                <ChatBell />
                <NotificationBell />
              </>
            )}
            <button className="p-2 text-foreground" onClick={() => setIsOpen(!isOpen)} aria-label="Toggle menu">
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-border animate-fade-in">
            <div className="flex flex-col gap-3">
              {!user ? (
                guestNavLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      location.pathname === link.path ? "bg-muted text-b4-teal" : "text-muted-foreground hover:bg-muted"
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    {link.name}
                  </Link>
                ))
              ) : (
                <>
                  <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Engine
                  </div>
                  {engineLinks.map((link) => {
                    const Icon = link.icon;
                    return (
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
                        <Icon size={16} />
                        {link.name}
                      </Link>
                    );
                  })}
                  <Link
                    to="/opportunities"
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      location.pathname === "/opportunities"
                        ? "bg-muted text-b4-teal"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    Opportunities
                  </Link>

                  <div className="px-4 pt-3 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Publish
                  </div>
                  {publishLinks.map((link) => {
                    const Icon = link.icon;
                    return (
                      <Link
                        key={link.path}
                        to={link.path}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted transition-colors flex items-center gap-2"
                        onClick={() => setIsOpen(false)}
                      >
                        <Icon size={16} />
                        {link.name}
                      </Link>
                    );
                  })}

                  <div className="px-4 pt-3 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    More
                  </div>
                  {moreLinks.map((link) => {
                    const Icon = link.icon;
                    return (
                      <Link
                        key={link.path}
                        to={link.path}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted transition-colors flex items-center gap-2"
                        onClick={() => setIsOpen(false)}
                      >
                        <Icon size={16} />
                        {link.name}
                      </Link>
                    );
                  })}
                </>
              )}
              <div className="flex flex-col gap-2 px-4 pt-2">
                {!loading &&
                  (user ? (
                    <>
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/profile" onClick={() => setIsOpen(false)}>
                          <User size={16} className="mr-1" />
                          Profile
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          await signOut();
                          setIsOpen(false);
                        }}
                      >
                        <LogOut size={16} className="mr-1" />
                        Sign Out
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" size="sm" className="flex-1" asChild>
                        <Link to="/login" onClick={() => setIsOpen(false)}>
                          Log In
                        </Link>
                      </Button>
                      <Button variant="teal" size="sm" className="flex-1" asChild>
                        <Link to="/auth?mode=signup" onClick={() => setIsOpen(false)}>
                          Get Started
                        </Link>
                      </Button>
                    </>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
