import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { Eye, EyeOff, ArrowRight, Lightbulb, Users } from "lucide-react";
import { z } from "zod";

type UserRole = "entrepreneur" | "cobuilder";

const emailSchema = z.string().email("Please enter a valid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");
const nameSchema = z.string().min(2, "Name must be at least 2 characters");

const Auth = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Support /login, /signup and /auth?mode=...
  const routeMode: "login" | "signup" =
    location.pathname === "/signup" || searchParams.get("mode") === "signup"
      ? "signup"
      : location.pathname === "/login" || searchParams.get("mode") === "login"
        ? "login"
        : "login";

  const routeRole = (searchParams.get("role") as UserRole) || "cobuilder";

  const [mode, setMode] = useState<"login" | "signup">(routeMode);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>(routeRole);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; fullName?: string }>({});

  const { toast } = useToast();
  const { signIn, signUp, user } = useAuth();
  const { onboardingState, loading: onboardingLoading } = useOnboarding();
  const navigate = useNavigate();

  useEffect(() => {
    setMode(routeMode);
  }, [routeMode]);

  useEffect(() => {
    setSelectedRole(routeRole);
  }, [routeRole]);

  useEffect(() => {
    if (user && !onboardingLoading) {
      // Check if onboarding is completed to redirect appropriately
      const isCoBuilderComplete =
        onboardingState?.primary_role === "cobuilder" &&
        onboardingState?.current_step >= 8 &&
        onboardingState?.onboarding_completed;
      const isEntrepreneurComplete =
        onboardingState?.primary_role === "entrepreneur" &&
        onboardingState?.current_step >= 2 &&
        onboardingState?.onboarding_completed;

      if (isCoBuilderComplete || isEntrepreneurComplete) {
        navigate("/", { replace: true });
      } else {
        navigate("/onboarding", { replace: true });
      }
    }
  }, [user, onboardingState, onboardingLoading, navigate]);

  const validateForm = () => {
    const newErrors: typeof errors = {};

    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }

    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }

    if (mode === "signup") {
      const nameResult = nameSchema.safeParse(fullName);
      if (!nameResult.success) {
        newErrors.fullName = nameResult.error.errors[0].message;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      if (mode === "login") {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast({
              title: "Login Failed",
              description: "Invalid email or password. Please try again.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Login Failed",
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Welcome back!",
            description: "You have successfully logged in.",
          });
          // Redirect is handled by useEffect when user state updates
        }
      } else {
        const { error } = await signUp(email, password, fullName, selectedRole);
        if (error) {
          if (error.message.includes("already registered")) {
            toast({
              title: "Account Exists",
              description: "This email is already registered. Please log in instead.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Sign Up Failed",
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Account Created!",
            description: "Welcome to B4 Platform. You're now logged in.",
          });
          // Redirect is handled by useEffect when user state updates
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-20">
        <section className="min-h-[calc(100vh-5rem)] flex items-center justify-center py-16 px-4">
          <div className="w-full max-w-md">
            {/* Header */}
            <div className="text-center mb-8">
              <Link to="/" className="inline-flex items-center gap-2 mb-6">
                <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-xl">B4</span>
                </div>
              </Link>
              <h1 className="font-display text-3xl font-bold text-foreground mb-2">
                {mode === "login" ? "Welcome Back" : "Join B4 Platform"}
              </h1>
              <p className="text-muted-foreground">
                {mode === "login" ? "Sign in to access your dashboard" : "Create your account to get started"}
              </p>
            </div>

            {/* Auth Form */}
            <div className="bg-card rounded-2xl border border-border p-8 shadow-lg">
              {/* Role Selection for Signup */}
              {mode === "signup" && (
                <div className="mb-6">
                  <Label className="mb-3 block">I want to join as:</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedRole("cobuilder")}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        selectedRole === "cobuilder"
                          ? "border-b4-teal bg-b4-teal/5"
                          : "border-border hover:border-muted-foreground/30"
                      }`}
                    >
                      <Users
                        className={`w-5 h-5 mb-2 ${
                          selectedRole === "cobuilder" ? "text-b4-teal" : "text-muted-foreground"
                        }`}
                      />
                      <div className="font-medium text-sm text-foreground">Co-Builder</div>
                      <div className="text-xs text-muted-foreground">Earn equity</div>
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {mode === "signup" && (
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className={`h-12 ${errors.fullName ? "border-destructive" : ""}`}
                    />
                    {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`h-12 ${errors.email ? "border-destructive" : ""}`}
                  />
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    {mode === "login" && (
                      <Link to="/forgot-password" className="text-sm text-b4-teal hover:underline">
                        Forgot password?
                      </Link>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`h-12 pr-12 ${errors.password ? "border-destructive" : ""}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                </div>

                <Button type="submit" variant="teal" size="lg" className="w-full" disabled={isLoading}>
                  {isLoading
                    ? mode === "login"
                      ? "Signing in..."
                      : "Creating account..."
                    : mode === "login"
                      ? "Sign In"
                      : "Create Account"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
                  <button
                    type="button"
                    onClick={() => setMode(mode === "login" ? "signup" : "login")}
                    className="text-b4-teal font-medium hover:underline cursor-pointer"
                  >
                    {mode === "login" ? "Sign Up" : "Sign In"}
                  </button>
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Auth;
