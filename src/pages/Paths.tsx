import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Briefcase,
  Lightbulb,
  Building2,
  Star,
  Compass,
  ShoppingBag,
  GraduationCap,
  BookOpen,
  FileText,
  Users,
  Rocket,
  Settings,
  Layers,
  TrendingUp,
} from "lucide-react";

type PathStep = {
  number: number;
  icon: React.ElementType;
  title: string;
  description: string;
  link: string;
  cta: string;
};

const careerSteps: PathStep[] = [
  { number: 1, icon: Compass, title: "Know What You Do", description: "Discover your Natural Role based on your strengths, personality and LinkedIn profile. Understand what makes you unique.", link: "/decoder", cta: "Decode Your Role" },
  { number: 2, icon: ShoppingBag, title: "Shape What You Do", description: "Build your professional resume and track record to showcase your expertise and attract opportunities.", link: "/resume", cta: "Build Your Resume" },
  { number: 3, icon: Users, title: "Join a Team", description: "Browse team environments looking for talent. Apply for roles that match your Natural Role and join an existing organization.", link: "/opportunities?tab=environments", cta: "Browse Environments" },
  { number: 4, icon: GraduationCap, title: "Strengthen What You Do", description: "Browse available trainings from other experts and level up your skills in areas that matter to you.", link: "/opportunities?tab=trainings", cta: "Browse Trainings" },
  { number: 5, icon: BookOpen, title: "Propose a Training", description: "Package your expertise into a training offer. Share your knowledge and earn revenue by teaching others.", link: "/resume", cta: "Create Training" },
  { number: 6, icon: Briefcase, title: "Propose a Service", description: "Offer your professional services on the platform. Define your expertise, set your terms, and attract clients.", link: "/resume", cta: "Create Service" },
  { number: 7, icon: FileText, title: "Apply for a Tender", description: "Find consulting and project tenders that match your Natural Role and apply with your track record.", link: "/opportunities?tab=tenders", cta: "View Tenders" },
];

const entrepreneurshipSteps: PathStep[] = [
  { number: 1, icon: Rocket, title: "Create a Project", description: "Launch your startup idea on B4. Define your vision, set up equity-based roles, and recruit co-builders to bring it to life.", link: "/create-idea", cta: "Start Your Project" },
  { number: 2, icon: Users, title: "Join a Project", description: "Browse existing startup projects looking for co-builders. Apply with your Natural Role and earn equity by contributing your skills.", link: "/opportunities", cta: "Browse Projects" },
  { number: 3, icon: Settings, title: "Manage a Project", description: "Continue developing your startup ideas. Scale as an Initiator or as a Co-Builder — manage milestones, team, and growth.", link: "/start", cta: "Manage Your Project" },
];

const consultingSteps: PathStep[] = [
  { number: 1, icon: Layers, title: "Structure What You Do", description: "Turn your expertise into a structured consulting offer. Define your services, methodology, and value proposition in a clear framework.", link: "/advisory", cta: "Start Structuring" },
  { number: 2, icon: TrendingUp, title: "Scale Your Structure", description: "Grow your consulting practice into a scalable entity. Build your brand, expand your reach, and create a decentralized business.", link: "/advisory", cta: "Start Scaling" },
];

type PathKey = "career" | "entrepreneurship" | "consulting";

const paths: {
  key: PathKey;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  description: string;
  link: string;
  gradient: string;
  steps: PathStep[];
  stepGradient: string;
}[] = [
  {
    key: "career",
    icon: Briefcase,
    title: "Career",
    subtitle: "Build & monetize your expertise",
    description: "Discover your natural role, showcase your skills, propose or join trainings, and apply for tenders.",
    link: "/career",
    gradient: "from-primary to-secondary",
    steps: careerSteps,
    stepGradient: "from-primary to-secondary",
  },
  {
    key: "entrepreneurship",
    icon: Lightbulb,
    title: "Entrepreneurship",
    subtitle: "Launch or join a venture",
    description: "Create your own startup project or join an existing one as a co-builder with equity.",
    link: "/entrepreneurship",
    gradient: "from-secondary to-accent",
    steps: entrepreneurshipSteps,
    stepGradient: "from-secondary to-accent",
  },
  {
    key: "consulting",
    icon: Building2,
    title: "Consulting",
    subtitle: "Scale your practice",
    description: "Structure your expertise into a consulting offer and scale it into an independent practice.",
    link: "/consulting",
    gradient: "from-accent to-primary",
    steps: consultingSteps,
    stepGradient: "from-accent to-primary",
  },
];

const STORAGE_KEY = "b4-favorite-paths";

const Paths = () => {
  const [favorites, setFavorites] = useState<PathKey[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (key: PathKey, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFavorites((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const favoritedPaths = paths.filter((p) => favorites.includes(p.key));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageTransition>
        <main className="container mx-auto px-4 pt-24 md:pt-28 pb-8 md:pb-12">
          <div className="text-center mb-16">
            <h1 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-4">
              Choose Your Path
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Three ways to grow with B4 — pick the one that fits your ambition.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {paths.map((path) => {
              const isFav = favorites.includes(path.key);
              return (
                <Link
                  key={path.title}
                  to={path.link}
                  className="group relative rounded-2xl border border-border bg-card p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-secondary/30"
                >
                  <button
                    onClick={(e) => toggleFavorite(path.key, e)}
                    className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-muted transition-colors"
                    aria-label={isFav ? "Remove from focus" : "Add to focus"}
                  >
                    <Star
                      className={`w-5 h-5 transition-colors ${
                        isFav
                          ? "fill-secondary text-secondary"
                          : "text-muted-foreground hover:text-secondary"
                      }`}
                    />
                  </button>
                  <div
                    className={`w-14 h-14 rounded-xl bg-gradient-to-br ${path.gradient} flex items-center justify-center mb-6`}
                  >
                    <path.icon className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <h2 className="font-display text-2xl font-bold text-foreground mb-2">
                    {path.title}
                  </h2>
                  <p className="text-sm font-medium text-secondary mb-3">
                    {path.subtitle}
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                    {path.description}
                  </p>
                  <span className="inline-flex items-center text-sm font-semibold text-secondary group-hover:gap-2 transition-all">
                    Explore <ArrowRight className="w-4 h-4 ml-1" />
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Favorited paths steps shown inline */}
          {favoritedPaths.length > 0 && (
            <div className="mt-16 max-w-3xl mx-auto space-y-12">
              {favoritedPaths.map((path) => (
                <div key={path.key}>
                  <div className="flex items-center gap-3 mb-6">
                    <div
                      className={`w-10 h-10 rounded-lg bg-gradient-to-br ${path.gradient} flex items-center justify-center`}
                    >
                      <path.icon className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <h2 className="font-display text-2xl font-bold text-foreground">
                      {path.title}
                    </h2>
                  </div>
                  <div className="space-y-4">
                    {path.steps.map((step) => (
                      <div
                        key={step.number}
                        className="flex gap-5 items-start p-5 rounded-2xl border border-border bg-card hover:border-secondary/30 transition-all"
                      >
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-11 h-11 rounded-xl bg-gradient-to-br ${path.stepGradient} flex items-center justify-center text-primary-foreground font-bold text-base shrink-0`}
                          >
                            {step.number}
                          </div>
                          {step.number < path.steps.length && (
                            <div className="w-px h-5 bg-border mt-2" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <step.icon className="w-4 h-4 text-secondary" />
                            <h3 className="font-display text-lg font-bold text-foreground">
                              {step.title}
                            </h3>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                            {step.description}
                          </p>
                          <Button variant="outline" size="sm" asChild>
                            <Link to={step.link}>
                              {step.cta} <ArrowRight className="w-4 h-4 ml-1" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </PageTransition>
      <Footer />
    </div>
  );
};

export default Paths;
