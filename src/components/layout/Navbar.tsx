import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const navLinks = [
  { name: "Home", path: "/" },
  { name: "About", path: "/about" },
  { name: "Boxes", path: "/boxes" },
  { name: "Programs", path: "/programs" },
  { name: "Join Us", path: "/join" },
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { user, signOut, loading } = useAuth();

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
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User size={16} />
                    <span className="max-w-[120px] truncate">{user.email}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={signOut}>
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
              <div className="flex gap-2 px-4 pt-2">
                {!loading && (
                  user ? (
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => { signOut(); setIsOpen(false); }}>
                      <LogOut size={16} className="mr-1" />
                      Sign Out
                    </Button>
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
