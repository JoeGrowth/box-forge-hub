import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { 
  Lightbulb, 
  Users, 
  Building2,
  ArrowRight,
  CheckCircle,
  Rocket,
  Award,
  Handshake
} from "lucide-react";

type Role = "entrepreneur" | "cobuilder" | "partner";

const roles: { id: Role; icon: typeof Lightbulb; title: string; description: string; benefits: string[] }[] = [
  {
    id: "entrepreneur",
    icon: Lightbulb,
    title: "Entrepreneur",
    description: "You have a startup idea and want to build it with equity-based co-builders.",
    benefits: [
      "Access to vetted co-builders",
      "Structured startup creation process",
      "Fair equity distribution framework",
      "Box-specific mentorship",
    ],
  },
  {
    id: "cobuilder",
    icon: Users,
    title: "Co-Builder",
    description: "You have skills to contribute and want to earn equity in promising startups.",
    benefits: [
      "Earn equity, not just salary",
      "Build a portfolio of investments",
      "Certified training program",
      "Work on meaningful projects",
    ],
  },
  {
    id: "partner",
    icon: Building2,
    title: "Partner",
    description: "You represent an organization that wants to collaborate with B4 Platform.",
    benefits: [
      "Access to startup pipeline",
      "Co-innovation opportunities",
      "Talent network access",
      "Custom partnership models",
    ],
  },
];

const Join = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { needsOnboarding } = useOnboarding();
  const initialRole = (searchParams.get("role") as Role) || "entrepreneur";
  const [selectedRole, setSelectedRole] = useState<Role>(initialRole);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Redirect logged-in users who need onboarding
  useEffect(() => {
    if (user && needsOnboarding) {
      navigate("/onboarding", { replace: true });
    }
  }, [user, needsOnboarding, navigate]);

  const handleStartJourney = () => {
    if (user) {
      navigate("/onboarding");
    } else {
      navigate(`/auth?mode=signup&role=${selectedRole === "partner" ? "cobuilder" : selectedRole}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast({
      title: "Inquiry Submitted!",
      description: "We'll review your inquiry and get back to you within 48 hours.",
    });
    
    setIsSubmitting(false);
    (e.target as HTMLFormElement).reset();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-20">
        {/* Hero */}
        <section className="py-16 gradient-hero text-primary-foreground">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl">
              <span className="inline-block px-4 py-1 rounded-full bg-primary-foreground/10 text-sm font-medium mb-6">
                Join the Movement
              </span>
              <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
                Start Your Journey
              </h1>
              <p className="text-lg text-primary-foreground/80 max-w-2xl">
                Whether you're an entrepreneur with a vision or a skilled professional 
                ready to co-build, there's a place for you at B4 Platform.
              </p>
            </div>
          </div>
        </section>

        {/* Role Selection & CTA */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12">
              {/* Role Selection */}
              <div>
                <h2 className="font-display text-2xl font-bold text-foreground mb-6">
                  I want to join as...
                </h2>
                
                <div className="space-y-4">
                  {roles.map((role) => (
                    <button
                      key={role.id}
                      onClick={() => setSelectedRole(role.id)}
                      className={`w-full text-left p-6 rounded-2xl border-2 transition-all ${
                        selectedRole === role.id
                          ? "border-b4-teal bg-b4-teal/5"
                          : "border-border bg-card hover:border-muted-foreground/30"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          selectedRole === role.id 
                            ? "bg-b4-teal text-primary-foreground" 
                            : "bg-muted text-muted-foreground"
                        }`}>
                          <role.icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-foreground mb-1">{role.title}</h3>
                          <p className="text-sm text-muted-foreground mb-4">{role.description}</p>
                          
                          {selectedRole === role.id && (
                            <ul className="space-y-2 animate-fade-in">
                              {role.benefits.map((benefit) => (
                                <li key={benefit} className="flex items-center gap-2 text-sm text-foreground">
                                  <CheckCircle className="w-4 h-4 text-b4-teal flex-shrink-0" />
                                  {benefit}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          selectedRole === role.id 
                            ? "border-b4-teal bg-b4-teal" 
                            : "border-muted-foreground/30"
                        }`}>
                          {selectedRole === role.id && (
                            <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* CTA Section */}
              <div>
                {user ? (
                  // Logged-in user - show quick start CTA
                  <div className="bg-card rounded-3xl border border-border p-8">
                    <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                      Ready to Continue?
                    </h2>
                    <p className="text-muted-foreground mb-6">
                      You're already signed in. Click below to continue your onboarding journey 
                      and get started as {selectedRole === "entrepreneur" ? "an Entrepreneur" : selectedRole === "cobuilder" ? "a Co-Builder" : "a Partner"}.
                    </p>
                    
                    <Button 
                      variant="teal" 
                      size="lg" 
                      className="w-full"
                      onClick={handleStartJourney}
                    >
                      Start Your Journey <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </div>
                ) : selectedRole === "partner" ? (
                  // Partnership inquiry form
                  <div className="bg-card rounded-3xl border border-border p-8">
                    <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                      Partnership Inquiry
                    </h2>
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">First Name</Label>
                          <Input id="firstName" placeholder="John" required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Last Name</Label>
                          <Input id="lastName" placeholder="Doe" required />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input id="email" type="email" placeholder="john@example.com" required />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="organization">Organization Name</Label>
                        <Input id="organization" placeholder="Acme Corp" required />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="partnerType">Partnership Interest</Label>
                        <Input id="partnerType" placeholder="e.g., Investment, Mentorship, Resources..." />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="message">Tell us about the partnership opportunity</Label>
                        <Textarea 
                          id="message" 
                          placeholder="Describe the partnership opportunity you're interested in..."
                          rows={4}
                          required
                        />
                      </div>

                      <Button 
                        type="submit" 
                        variant="teal" 
                        size="lg" 
                        className="w-full"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? "Submitting..." : (
                          <>Submit Inquiry <ArrowRight className="ml-2 w-4 h-4" /></>
                        )}
                      </Button>
                    </form>
                  </div>
                ) : (
                  // Not logged in - show signup CTA
                  <div className="bg-card rounded-3xl border border-border p-8">
                    <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                      Get Started
                    </h2>
                    
                    <p className="text-muted-foreground mb-6">
                      Create your account to begin your journey as {selectedRole === "entrepreneur" ? "an Entrepreneur" : "a Co-Builder"}.
                    </p>
                    
                    <Button 
                      variant="teal" 
                      size="lg" 
                      className="w-full mb-4"
                      onClick={handleStartJourney}
                    >
                      Create Account <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                    
                    <p className="text-center text-sm text-muted-foreground">
                      Already have an account?{" "}
                      <Link to="/login" className="text-b4-teal hover:underline">
                        Sign in
                      </Link>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Trust section */}
        <section className="py-16 bg-muted/50">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {[
                { icon: Rocket, stat: "50+", label: "Startups Launched" },
                { icon: Award, stat: "200+", label: "Active Co-Builders" },
                { icon: Handshake, stat: "$2.5M", label: "Equity Distributed" },
              ].map((item) => (
                <div key={item.label} className="text-center">
                  <div className="w-14 h-14 rounded-xl bg-b4-teal/10 flex items-center justify-center mx-auto mb-4">
                    <item.icon className="w-7 h-7 text-b4-teal" />
                  </div>
                  <div className="text-3xl font-bold text-foreground mb-1">{item.stat}</div>
                  <div className="text-sm text-muted-foreground">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Join;
