import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, Lock, CheckCircle } from "lucide-react";
import { z } from "zod";

const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener first
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state change:", event, !!session);

      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setHasValidSession(true);
        setIsCheckingSession(false);
      } else if (event === "SIGNED_OUT") {
        setHasValidSession(false);
      }
    });

    // Then check for existing session
    const checkSession = async () => {
      // Give the auth state listener time to process URL tokens
      await new Promise((resolve) => setTimeout(resolve, 500));

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        setHasValidSession(true);
      } else {
        // Only redirect if we still don't have a session after waiting
        toast({
          title: "Invalid or Expired Link",
          description: "Please request a new password reset link.",
          variant: "destructive",
        });
        navigate("/forgot-password");
      }
      setIsCheckingSession(false);
    };

    checkSession();

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  const validateForm = () => {
    const newErrors: typeof errors = {};

    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setIsSuccess(true);
        toast({
          title: "Password Updated",
          description: "Your password has been successfully reset.",
        });
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
              <h1 className="font-display text-3xl font-bold text-foreground mb-2">Set New Password</h1>
              <p className="text-muted-foreground">Enter your new password below</p>
            </div>

            <div className="bg-card rounded-2xl border border-border p-8 shadow-lg">
              {isCheckingSession ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-2 border-b4-teal border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Verifying your reset link...</p>
                </div>
              ) : isSuccess ? (
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-b4-teal/10 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-b4-teal" />
                  </div>
                  <h2 className="text-xl font-semibold text-foreground mb-2">Password Reset Complete</h2>
                  <p className="text-muted-foreground mb-6">Your password has been successfully updated.</p>
                  <Button variant="teal" className="w-full" onClick={() => navigate("/dashboard")}>
                    Go to Dashboard
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="password">New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`h-12 pl-10 pr-12 ${errors.password ? "border-destructive" : ""}`}
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

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`h-12 pl-10 pr-12 ${errors.confirmPassword ? "border-destructive" : ""}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
                  </div>

                  <Button type="submit" variant="teal" size="lg" className="w-full" disabled={isLoading}>
                    {isLoading ? "Updating..." : "Update Password"}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default ResetPassword;
