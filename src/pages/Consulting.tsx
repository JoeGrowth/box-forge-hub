import { useState, useEffect, useCallback } from "react";
import { Footer } from "@/components/layout/Footer";
import { ScrollToTopButton } from "@/components/layout/ScrollToTopButton";
import { PageTransition } from "@/components/layout/PageTransition";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen, Briefcase, FileText, Layers, TrendingUp, ArrowRight, ArrowLeft, Star, Plus, GraduationCap } from "lucide-react";
import { TrainTeamDialog } from "@/components/resume/TrainTeamDialog";
import { CreateServiceDialog } from "@/components/consulting/CreateServiceDialog";
import { ServiceListing } from "@/components/consulting/ServiceListing";

const STORAGE_KEY = "b4-favorite-steps";

const sellSteps = [
  { id: "cons-sell-1", number: 1, icon: BookOpen, title: "Propose a Training", description: "Package your expertise into a training offer. Share your knowledge and earn revenue by teaching others.", link: "", cta: "Submit Training", isDialog: true },
  { id: "cons-sell-2", number: 2, icon: Briefcase, title: "Propose a Service", description: "Offer your professional services on the platform. Define your expertise, set your terms, and attract clients.", link: "", cta: "Create Service", isServiceDialog: true },
  { id: "cons-sell-3", number: 3, icon: FileText, title: "Apply for a Tender", description: "Find consulting and project tenders that match your Natural Role and apply with your track record.", link: "/opportunities?tab=tenders", cta: "View Tenders" },
];

const structureSteps = [
  { id: "cons-struct-1", number: 4, icon: Layers, title: "Structure What You Do", description: "Turn your expertise into a structured consulting offer. Define your services, methodology, and value proposition in a clear framework.", link: "/startstructuring", cta: "Start Structuring" },
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
  const [showTrainDialog, setShowTrainDialog] = useState(false);
  const [showServiceDialog, setShowServiceDialog] = useState(false);
  const [serviceRefreshKey, setServiceRefreshKey] = useState(0);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  };

  const handleServiceCreated = useCallback(() => {
    setServiceRefreshKey((k) => k + 1);
  }, []);

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
          {"isDialog" in step && step.isDialog ? (
            <Button variant="outline" size="sm" onClick={() => setShowTrainDialog(true)}>
              {step.cta} <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : "isServiceDialog" in step && step.isServiceDialog ? (
            <Button variant="outline" size="sm" onClick={() => setShowServiceDialog(true)}>
              {step.cta} <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button variant="outline" size="sm" asChild>
              <Link to={step.link}>
                {step.cta} <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          )}
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
                Consulting Engine
              </h1>
              <p className="text-muted-foreground">
                Monetize your expertise
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="gap-2" onClick={() => setShowTrainDialog(true)}>
                <GraduationCap className="w-4 h-4" /> Create Training
              </Button>
              <Button className="gap-2" onClick={() => setShowServiceDialog(true)}>
                <Plus className="w-4 h-4" /> Create Service
              </Button>
            </div>
          </div>

          {/* Service Marketplace */}
          <div className="mb-12">
            <h2 className="font-display text-xl font-bold text-foreground mb-4">Service Marketplace</h2>
            <ServiceListing refreshKey={serviceRefreshKey} />
          </div>

          <div className="max-w-3xl mx-auto space-y-6">
            <div className="text-center py-4">
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">Sell What You Do</h2>
            </div>
            {sellSteps.map((step, idx) => renderStep(step, idx === sellSteps.length - 1))}

            <div className="text-center py-4">
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">Structure What You Do</h2>
            </div>
            {structureSteps.map((step, idx) => renderStep(step, idx === structureSteps.length - 1))}

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
      <TrainTeamDialog open={showTrainDialog} onOpenChange={setShowTrainDialog} />
      <CreateServiceDialog open={showServiceDialog} onOpenChange={setShowServiceDialog} onCreated={handleServiceCreated} />
    </div>
  );
};

export default Consulting;
