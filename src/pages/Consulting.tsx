import { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ScrollToTopButton } from "@/components/layout/ScrollToTopButton";
import { PageTransition } from "@/components/layout/PageTransition";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen, Briefcase, FileText, Layers, TrendingUp, ArrowRight, ArrowLeft, Star } from "lucide-react";

const STORAGE_KEY = "b4-favorite-steps";

const sellSteps = [
  { id: "cons-sell-1", number: 1, icon: Layers, title: "Structure What You Do", description: "Turn your expertise into a structured consulting offer. Define your services, methodology, and value proposition in a clear framework.", link: "/startstructuring", cta: "Start Structuring" },
  { id: "cons-sell-2", number: 2, icon: BookOpen, title: "Propose a Training", description: "Package your expertise into a training offer. Share your knowledge and earn revenue by teaching others.", link: "/resume", cta: "Create Training" },
  { id: "cons-sell-3", number: 3, icon: Briefcase, title: "Propose a Service", description: "Offer your professional services on the platform. Define your expertise, set your terms, and attract clients.", link: "/resume", cta: "Create Service" },
  { id: "cons-sell-4", number: 4, icon: FileText, title: "Apply for a Tender", description: "Find consulting and project tenders that match your Natural Role and apply with your track record.", link: "/opportunities?tab=tenders", cta: "View Tenders" },
];

const scaleSteps = [
  { id: "cons-scale-1", number: 5, icon: TrendingUp, title: "Scale Your Structure", description: "Grow your consulting practice into a scalable entity. Build your brand, expand your reach, and create a decentralized business.", link: "/startscaling", cta: "Start Scaling" },
];

const Consulting = () => {
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

  const renderStep = (step: typeof sellSteps[number], isLast: boolean) => {
    const isFav = favorites.includes(step.id);
    return (
      <div
        key={step.id}
        className="flex gap-6 items-start p-6 rounded-2xl border border-border bg-card hover:border-secondary/30 transition-all"
      >
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center text-primary-foreground font-bold text-lg shrink-0">
            {step.number}
          </div>
          {!isLast && <div className="w-px h-6 bg-border mt-2" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <step.icon className="w-5 h-5 text-accent" />
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

          <div className="text-center mb-16">
            <span className="inline-block text-secondary font-semibold text-sm uppercase tracking-wide mb-3">
              Consulting Path
            </span>
            <h1 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-4">
              Sell & Scale Your Practice
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Monetize your expertise, then structure and grow it into an independent consulting business.
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-6">
            {sellSteps.map((step, idx) => renderStep(step, idx === sellSteps.length - 1))}

            {/* Subtitle divider */}
            <div className="text-center py-6">
              <span className="inline-block text-secondary font-semibold text-sm uppercase tracking-wide mb-1">Next Level</span>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">Scale Your Structure</h2>
            </div>

            {scaleSteps.map((step, idx) => renderStep(step, idx === scaleSteps.length - 1))}
          </div>
        </main>
      </PageTransition>
      <Footer />
      <ScrollToTopButton />
    </div>
  );
};

export default Consulting;
