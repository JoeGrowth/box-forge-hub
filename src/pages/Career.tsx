import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ScrollToTopButton } from "@/components/layout/ScrollToTopButton";
import { PageTransition } from "@/components/layout/PageTransition";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Compass, ShoppingBag, GraduationCap, Users, ArrowRight, ArrowLeft, Star } from "lucide-react";

const STORAGE_KEY = "b4-favorite-steps";

const steps = [
  { id: "career-1", number: 1, icon: Compass, title: "Know What You Do", description: "Discover your Natural Role based on your strengths, personality and LinkedIn profile. Understand what makes you unique.", link: "/decoder", cta: "Decode Your Role" },
  { id: "career-2", number: 2, icon: ShoppingBag, title: "Shape What You Do", description: "Build your professional resume and track record to showcase your expertise and attract opportunities.", link: "/resume", cta: "Build Your Resume" },
  { id: "career-3", number: 3, icon: GraduationCap, title: "Strengthen What You Do", description: "Browse available trainings from other experts and level up your skills in areas that matter to you.", link: "/opportunities?tab=trainings", cta: "Browse Trainings" },
  { id: "career-4", number: 4, icon: Users, title: "Join a Team", description: "Browse team environments looking for talent. Apply for roles that match your Natural Role and join an existing organization.", link: "/opportunities?tab=environments", cta: "Browse Environments" },
];

const Career = () => {
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageTransition>
        <main className="container mx-auto px-4 py-16 md:py-24">
          <div className="mb-6">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/paths">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back to Paths
              </Link>
            </Button>
          </div>

          <div className="flex items-center justify-between mb-12 bg-muted/40 rounded-2xl p-6">
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-1">
                Career Engine
              </h1>
              <p className="text-muted-foreground">
                Build and structure your expertise
              </p>
            </div>
            <Button className="gap-2" asChild>
              <Link to="/track-record">
                <Plus className="w-4 h-4" /> Update Track Record
              </Link>
            </Button>
          </div>

          <div className="max-w-3xl mx-auto space-y-6">
            {steps.map((step, idx) => {
              const isFav = favorites.includes(step.id);
              return (
                <div
                  key={step.number}
                  className="flex gap-6 items-start p-6 rounded-2xl border border-border bg-card hover:border-secondary/30 transition-all"
                >
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground font-bold text-lg shrink-0">
                      {step.number}
                    </div>
                    {idx < steps.length - 1 && <div className="w-px h-6 bg-border mt-2" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <step.icon className="w-5 h-5 text-secondary" />
                      <h3 className="font-display text-xl font-bold text-foreground">{step.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{step.description}</p>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={step.link}>
                        {step.cta} <ArrowRight className="w-4 h-4 ml-1" />
                      </Link>
                    </Button>
                  </div>
                  <button
                    onClick={() => toggleFavorite(step.id)}
                    className="p-1.5 rounded-full hover:bg-muted transition-colors shrink-0"
                    aria-label={isFav ? "Remove from focus" : "Add to focus"}
                  >
                    <Star className={`w-5 h-5 transition-colors ${isFav ? "fill-secondary text-secondary" : "text-muted-foreground hover:text-secondary"}`} />
                  </button>
                </div>
              );
            })}
          </div>
        </main>
      </PageTransition>
      <Footer />
      <ScrollToTopButton />
    </div>
  );
};

export default Career;
