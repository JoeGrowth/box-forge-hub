import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/layout/PageTransition";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Rocket, Users, ArrowRight, ArrowLeft } from "lucide-react";

const steps = [
  {
    number: 1,
    icon: Rocket,
    title: "Create a Project",
    description:
      "Launch your startup idea on B4. Define your vision, set up equity-based roles, and recruit co-builders to bring it to life.",
    link: "/create-idea",
    cta: "Start Your Project",
  },
  {
    number: 2,
    icon: Users,
    title: "Join a Project",
    description:
      "Browse existing startup projects looking for co-builders. Apply with your Natural Role and earn equity by contributing your skills.",
    link: "/opportunities",
    cta: "Browse Projects",
  },
];

const Entrepreneurship = () => {
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
              Entrepreneurship Path
            </span>
            <h1 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-4">
              Launch or Join a Venture
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Whether you have an idea or want to join one — start building with equity.
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-6">
            {steps.map((step) => (
              <div
                key={step.number}
                className="flex gap-6 items-start p-6 rounded-2xl border border-border bg-card hover:border-secondary/30 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-secondary to-accent flex items-center justify-center text-primary-foreground font-bold text-lg shrink-0">
                  {step.number}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <step.icon className="w-5 h-5 text-secondary" />
                    <h3 className="font-display text-xl font-bold text-foreground">
                      {step.title}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
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
        </main>
      </PageTransition>
      <Footer />
    </div>
  );
};

export default Entrepreneurship;
