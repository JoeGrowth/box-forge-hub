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
  Lock,
} from "lucide-react";
import { useEngineAccess, type EngineKey } from "@/hooks/useEngineAccess";
import { useTalentReadiness } from "@/hooks/useTalentReadiness";
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

const engineLinks: Array<{ name: string; path: string; icon: typeof Briefcase; key: EngineKey }> = [
  { name: "Career", path: "/career", icon: Briefcase, key: "career" },
  { name: "Consulting", path: "/consulting", icon: Handshake, key: "consulting" },
  { name: "Entrepreneurship", path: "/entrepreneurship", icon: Lightbulb, key: "entrepreneurship" },
];

const publishLinks: Array<{
  name: string;
  path: string;
  icon: typeof Briefcase;
  desc: string;
  orgAdminOnly?: boolean;
}> = [
  { name: "Recruiting", path: "/publish-job", icon: Briefcase, desc: "Offer a job", orgAdminOnly: true },
  { name: "Consulting", path: "/publish-consulting", icon: Handshake, desc: "Create a service" },
  { name: "Launching", path: "/create-idea", icon: Lightbulb, desc: "Start a venture" },
  { name: "Training", path: "/publish-training", icon: GraduationCap, desc: "Submit a training" },
  { name: "Procuring", path: "/procuring", icon: FileText, desc: "Post a tender", orgAdminOnly: true },
];

const moreLinks = [
  { name: "Boxes", path: "/boxes", icon: Package },
  { name: "Programs", path: "/programs", icon: BookOpen },
  { name: "Organizations", path: "/organizations", icon: Building2 },
  { name: "Consulting", path: "/advisory", icon: Compass },
  { name: "Brand Identity", path: "/brand-identity", icon: Sparkles },
  { name: "Checklist", path: "/checklist", icon: ListChecks },
];

// Synchronous read of cached admin flag so first paint is stable.
function readCachedAdmin(userId: string | undefined): boolean {
  if (!userId) return false;
  try {
    return localStorage.getItem(`b4_is_admin:${userId}`) === "1";
  } catch {
    return false;
  }
}

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [engineOpen, setEngineOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const location = useLocation();
  const { user, signOut, loading } = useAuth();
  const { canAccessBoosting, canAccessScaling, potentialRole } = useUserStatus();

  const { engines: engineAccess } = useEngineAccess();
  const { talentReady, isOrgAdmin, missing: talentMissing } = useTalentReadiness();
  const talentLockTitle = talentReady
    ? undefined
    : `Locked — complete: ${talentMissing.join(", ")}`;

  // Hydrate synchronously from localStorage (lazy initializer) so the Admin
  // button is present on first paint when cached — no flash, no layout shift.
  const [isAdmin, setIsAdmin] = useState<boolean>(() => readCachedAdmin(user?.id));

  // Re-sync when user changes (login/logout) and re-verify in background.
  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    setIsAdmin(readCachedAdmin(user.id));
    const cacheKey = `b4_is_admin:${user.id}`;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (cancelled) return;
      const next = !!data;
      setIsAdmin(next);
      try {
        localStorage.setItem(cacheKey, next ? "1" : "0");
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);


  const isEngineActive = useMemo(() => engineLinks.some((l) => location.pathname === l.path), [location.pathname]);

  return (
    <nav data-track-kind="navbar" className="fixed top-0 left-0 right-0 z-50 glass">
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
                      const locked = !engineAccess[link.key].unlocked;
                      const topMissing = engineAccess[link.key].missing[0]?.label;
                      return (
                        <DropdownMenuItem key={link.path} asChild>
                          <Link
                            to={link.path}
                            className={`flex items-center gap-2 cursor-pointer ${
                              location.pathname === link.path ? "text-b4-teal" : "text-foreground"
                            } ${locked ? "opacity-70" : ""}`}
                            title={locked && topMissing ? `Locked — needs: ${topMissing}` : undefined}
                          >
                            <Icon size={16} />
                            <span className="flex-1">{link.name}</span>
                            {locked && <Lock size={12} className="text-muted-foreground" />}
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Link
                  to={talentReady ? "/opportunities" : "/dashboard"}
                  onClick={(e) => {
                    if (!talentReady) e.preventDefault();
                  }}
                  aria-disabled={!talentReady}
                  title={talentLockTitle}
                  className={`text-sm font-medium transition-colors hover:text-b4-teal inline-flex items-center gap-1 ${
                    location.pathname === "/opportunities" ? "text-b4-teal" : "text-muted-foreground"
                  } ${!talentReady ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  Opportunities
                  {!talentReady && <Lock size={12} className="text-muted-foreground" />}
                </Link>

                <DropdownMenu open={publishOpen} onOpenChange={setPublishOpen}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="teal"
                      size="sm"
                      className="gap-1"
                      disabled={!talentReady}
                      title={talentLockTitle}
                    >
                      <Plus size={14} />
                      Publish
                      {!talentReady && <Lock size={12} />}
                      <ChevronDown
                        size={14}
                        className={`transition-transform duration-200 ${publishOpen ? "rotate-180" : ""}`}
                      />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 mt-2">
                    {publishLinks.map((link) => {
                      const Icon = link.icon;
                      const linkLocked = link.orgAdminOnly && !isOrgAdmin;
                      return (
                        <DropdownMenuItem
                          key={link.path}
                          asChild
                          disabled={linkLocked}
                          onSelect={(e) => {
                            if (linkLocked) e.preventDefault();
                          }}
                        >
                          <Link
                            to={linkLocked ? "/organizations" : link.path}
                            className={`flex items-start gap-3 py-2 ${
                              linkLocked ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                            }`}
                            title={
                              linkLocked
                                ? "Locked — become admin of an organization in Organizations"
                                : undefined
                            }
                          >
                            <Icon size={18} className="mt-0.5 text-b4-teal shrink-0" />
                            <div className="flex flex-col flex-1">
                              <span className="text-sm font-medium text-foreground inline-flex items-center gap-1">
                                {link.name}
                                {linkLocked && <Lock size={12} className="text-muted-foreground" />}
                              </span>
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
          <div className="md:hidden py-4 border-t border-border animate-fade-in max-h-[calc(100vh-4rem)] overflow-y-auto overscroll-contain">
            <div className="flex flex-col gap-3 pb-8">

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
                    const locked = !engineAccess[link.key].unlocked;
                    return (
                      <Link
                        key={link.path}
                        to={link.path}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                          location.pathname === link.path
                            ? "bg-muted text-b4-teal"
                            : "text-muted-foreground hover:bg-muted"
                        } ${locked ? "opacity-70" : ""}`}
                        onClick={() => setIsOpen(false)}
                      >
                        <Icon size={16} />
                        <span className="flex-1">{link.name}</span>
                        {locked && <Lock size={12} className="text-muted-foreground" />}
                      </Link>
                    );
                  })}
                  <Link
                    to={talentReady ? "/opportunities" : "/dashboard"}
                    onClick={(e) => {
                      if (!talentReady) e.preventDefault();
                      setIsOpen(false);
                    }}
                    aria-disabled={!talentReady}
                    title={talentLockTitle}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                      location.pathname === "/opportunities"
                        ? "bg-muted text-b4-teal"
                        : "text-muted-foreground hover:bg-muted"
                    } ${!talentReady ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    <span className="flex-1">Opportunities</span>
                    {!talentReady && <Lock size={12} className="text-muted-foreground" />}
                  </Link>

                  <div className="px-4 pt-3 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Publish {!talentReady && <Lock size={12} className="inline text-muted-foreground" />}
                  </div>
                  {publishLinks.map((link) => {
                    const Icon = link.icon;
                    const linkLocked = !talentReady || (link.orgAdminOnly && !isOrgAdmin);
                    const lockReason = !talentReady
                      ? talentLockTitle
                      : link.orgAdminOnly && !isOrgAdmin
                      ? "Locked — become admin of an organization in Organizations"
                      : undefined;
                    return (
                      <Link
                        key={link.path}
                        to={linkLocked ? "/organizations" : link.path}
                        onClick={(e) => {
                          if (linkLocked) e.preventDefault();
                          setIsOpen(false);
                        }}
                        aria-disabled={linkLocked}
                        title={lockReason}
                        className={`px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted transition-colors flex items-center gap-2 ${
                          linkLocked ? "opacity-60 cursor-not-allowed" : ""
                        }`}
                      >
                        <Icon size={16} />
                        <span className="flex-1">{link.name}</span>
                        {linkLocked && <Lock size={12} className="text-muted-foreground" />}
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
                      {isAdmin && (
                        <Button variant="outline" size="sm" asChild>
                          <Link to="/admin" onClick={() => setIsOpen(false)}>
                            <Shield size={16} className="mr-1" />
                            Admin
                          </Link>
                        </Button>
                      )}
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
