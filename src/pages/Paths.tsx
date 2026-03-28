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
  id: string;
  number: number;
  icon: React.ElementType;
  title: string;
  description: string;
  link: string;
  cta: string;
};

const careerSteps: PathStep[] = [
  {
    id: "career-1",
    number: 1,
    icon: Compass,
    title: "Know What You Do",
    description: "Discover your Natural Role based on your strengths, personality and LinkedIn profile. Understand what makes you unique.",
    link: "/decoder",
    cta: "Decode Your Role",
  },
  {
    id: "career-2",
    number: 2,
    icon: ShoppingBag,
    title: "Shape What You Do",
    description: "Build your professional resume and track record to showcase your expertise and attract opportunities.",
    link: "/resume",
    cta: "Build Your Resume",
  },
  {
    id: "career-3",
    number: 3,
    icon: GraduationCap,
    title: "Strengthen What You Do",
    description: "Browse available trainings from other experts and level up your skills in areas that matter to you.",
    link: "/opportunities?tab=trainings",
    cta: "Browse Trainings",
  },
  {
    id: "career-4",
    number: 4,
    icon: Users,
    title: "Join a Team",
    description: "Browse team environments looking for talent. Apply for roles that match your Natural Role and join an existing organization.",
    link: "/opportunities?tab=environments",
    cta: "Browse Environments",
  },
];

const entrepreneurshipSteps: PathStep[] = [
  {
    id: "ent-1",
    number: 1,
    icon: Rocket,
    title: "Create a Project",
    description:
      "Launch your startup idea on B4 and become an initiator. Define your vision, set up equity-based roles, and recruit co-builders to bring it to life.",
    link: "/create-idea",
    cta: "Start Your Project",
  },
  {
    id: "ent-2",
    number: 2,
    icon: Users,
    title: "Join a Project",
    description:
      "Browse existing startup projects looking for co-builders. Apply with your Natural Role and earn equity by contributing your skills.",
    link: "/opportunities",
    cta: "Browse Projects",
  },
  {
    id: "ent-3",
    number: 3,
    icon: Settings,
    title: "Manage a Project",
    description:
      "Continue developing your startup ideas. Operate and grow the venture. Scale as an Initiator or as a Co-Builder — manage milestones, team, and growth.",
    link: "/start",
    cta: "Manage Your Project",
  },
];

const consultingSteps: PathStep[] = [
  {
    id: "cons-sell-1",
    number: 1,
    icon: BookOpen,
    title: "Propose a Training",
    description: "Package your expertise into a training offer. Share your knowledge and earn revenue by teaching others.",
    link: "/resume",
    cta: "Create Training",
  },
  {
    id: "cons-sell-2",
    number: 2,
    icon: Briefcase,
    title: "Propose a Service",
    description: "Offer your professional services on the platform. Define your expertise, set your terms, and attract clients.",
    link: "/resume",
    cta: "Create Service",
  },
  {
    id: "cons-sell-3",
    number: 3,
    icon: FileText,
    title: "Apply for a Tender",
    description: "Find consulting and project tenders that match your Natural Role and apply with your track record.",
    link: "/opportunities?tab=tenders",
    cta: "View Tenders",
  },
  {
    id: "cons-struct-1",
    number: 4,
    icon: Layers,
    title: "Structure What You Do",
    description: "Turn your expertise into a structured consulting offer. Define your services, methodology, and value proposition in a clear framework.",
    link: "/startstructuring",
    cta: "Start Structuring",
  },
  {
    id: "cons-scale-1",
    number: 5,
    icon: TrendingUp,
    title: "Scale Your Structure",
    description: "Grow your consulting practice into a scalable entity. Build your brand, expand your reach, and create a decentralized business.",
    link: "/startscaling",
    cta: "Start Scaling",
  },
];

type PathKey = "career" | "entrepreneurship" | "consulting";

const pathsData = [
  {
    key: "career" as PathKey,
    icon: Briefcase,
    title: "Career",
    subtitle: "Build & monetize your expertise",
    description: "Discover your natural role, showcase your skills, propose or join trainings, and apply for tenders.",
    link: "/career",
    gradient: "from-primary to-secondary",
    steps: careerSteps,
  },
  {
    key: "entrepreneurship" as PathKey,
    icon: Lightbulb,
    title: "Entrepreneurship",
    subtitle: "Launch or join a venture",
    description: "Create your own startup project or join an existing one as a co-builder with equity.",
    link: "/entrepreneurship",
    gradient: "from-secondary to-accent",
    steps: entrepreneurshipSteps,
  },
  {
    key: "consulting" as PathKey,
    icon: Building2,
    title: "Consulting",
    subtitle: "Scale your practice",
    description: "Structure your expertise into a consulting offer and scale it into an independent practice.",
    link: "/consulting",
    gradient: "from-accent to-primary",
    steps: consultingSteps,
  },
];

const STORAGE_KEY = "b4-favorite-steps";
const ORDER_STORAGE_KEY = "b4-paths-order";

const Paths = () => {
  const [favoriteSteps, setFavoriteSteps] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [pathOrder, setPathOrder] = useState<PathKey[]>(() => {
    try {
      const stored = localStorage.getItem(ORDER_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as PathKey[];
        if (parsed.length === 3) return parsed;
      }
    } catch {}
    return ["career", "entrepreneurship", "consulting"];
  });

  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(pathOrder));
  }, [pathOrder]);

  const orderedPaths = pathOrder.map((key) => pathsData.find((p) => p.key === key)!);

  const handleDragStart = (idx: number) => setDragIndex(idx);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (targetIdx: number) => {
    if (dragIndex === null || dragIndex === targetIdx) return;
    setPathOrder((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(targetIdx, 0, moved);
      return next;
    });
    setDragIndex(null);
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favoriteSteps));
  }, [favoriteSteps]);

  const toggleFavorite = (stepId: string) => {
    setFavoriteSteps((prev) => (prev.includes(stepId) ? prev.filter((id) => id !== stepId) : [...prev, stepId]));
  };

  // Collect all favorited steps grouped by path
  const favoritedByPath = pathsData
    .map((path) => ({
      ...path,
      favSteps: path.steps.filter((s) => favoriteSteps.includes(s.id)),
    }))
    .filter((p) => p.favSteps.length > 0);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageTransition>
        <main className="container mx-auto px-4 pt-24 md:pt-28 pb-8 md:pb-12">
          <div className="text-center mb-16">
            <h1 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-4">Choose Your Path</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Three ways to grow with B4 — pick the one that fits your ambition.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mt-4">
            {orderedPaths.map((path, idx) => (
              <Link
                key={path.key}
                to={path.link}
                draggable
                onDragStart={(e) => {
                  e.stopPropagation();
                  handleDragStart(idx);
                }}
                onDragOver={handleDragOver}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDrop(idx);
                }}
                className={`group relative rounded-2xl border border-border bg-card p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-secondary/30 ${dragIndex === idx ? "opacity-50" : ""}`}
              >
                <div
                  className={`w-14 h-14 rounded-xl bg-gradient-to-br ${path.gradient} flex items-center justify-center mb-6`}
                >
                  <path.icon className="w-7 h-7 text-primary-foreground" />
                </div>
                <h2 className="font-display text-2xl font-bold text-foreground mb-2">{path.title}</h2>
                <p className="text-sm font-medium text-secondary mb-3">{path.subtitle}</p>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">{path.description}</p>
                <span className="inline-flex items-center text-sm font-semibold text-secondary group-hover:gap-2 transition-all">
                  Explore <ArrowRight className="w-4 h-4 ml-1" />
                </span>
              </Link>
            ))}
          </div>

          {/* Favorited steps shown inline, grouped by path */}
          {favoritedByPath.length > 0 && (
            <div className="mt-16 max-w-3xl mx-auto space-y-12">
              <h2 className="font-display text-2xl font-bold text-foreground text-center">My Focus</h2>
              {favoritedByPath.map((path) => (
                <div key={path.key}>
                  <div className="flex items-center gap-3 mb-5">
                    <div
                      className={`w-9 h-9 rounded-lg bg-gradient-to-br ${path.gradient} flex items-center justify-center`}
                    >
                      <path.icon className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <h3 className="font-display text-lg font-bold text-foreground">{path.title}</h3>
                  </div>
                  <div className="space-y-4">
                    {path.favSteps.map((step) => (
                      <div
                        key={step.id}
                        className="flex gap-5 items-start p-5 rounded-2xl border border-border bg-card hover:border-secondary/30 transition-all"
                      >
                        <div
                          className={`w-11 h-11 rounded-xl bg-gradient-to-br ${path.gradient} flex items-center justify-center text-primary-foreground font-bold text-base shrink-0`}
                        >
                          {step.number}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <step.icon className="w-4 h-4 text-secondary" />
                            <h3 className="font-display text-lg font-bold text-foreground">{step.title}</h3>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{step.description}</p>
                          <Button variant="outline" size="sm" asChild>
                            <Link to={step.link}>
                              {step.cta} <ArrowRight className="w-4 h-4 ml-1" />
                            </Link>
                          </Button>
                        </div>
                        <button
                          onClick={() => toggleFavorite(step.id)}
                          className="p-1.5 rounded-full hover:bg-muted transition-colors shrink-0"
                          aria-label="Remove from focus"
                        >
                          <Star className="w-4 h-4 fill-secondary text-secondary" />
                        </button>
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
