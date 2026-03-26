import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ScrollToTopButton } from "@/components/layout/ScrollToTopButton";
import { PageTransition } from "@/components/layout/PageTransition";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  TrendingUp,
  Building2,
  Users,
  Settings,
  Crown,
  CheckCircle,
  ArrowRight,
  Network,
  GraduationCap,
  Laptop,
  Briefcase,
} from "lucide-react";

const scalingPhases = [
  {
    number: 1,
    icon: Building2,
    title: "Company Formation",
    description:
      "Formalize your practice into a legal entity. Move from freelancing to running a real consulting business with its own brand and identity.",
    details: [
      "Register your consulting entity (LLC, SAS, Ltd…)",
      "Create a company brand (logo, name, positioning)",
      "Link services to your natural role & methodology",
      "Issue your first invoice with external contributors",
    ],
  },
  {
    number: 2,
    icon: Settings,
    title: "Process Implementation",
    description:
      "Define and document your operational processes. Make your delivery repeatable and consistent across engagements.",
    details: [
      "Document your delivery process end-to-end",
      "Implement the process on a real mission",
      "Review and iterate based on results",
      "Deliver your first mission with a mixed team",
    ],
  },
  {
    number: 3,
    icon: Users,
    title: "Autonomous Operations",
    description:
      "Scale operations so the business delivers without you on every engagement. Hire or train a process manager.",
    details: [
      "Optimize & enhance delivery processes",
      "Complete 3+ missions delivered successfully",
      "Appoint a process manager (internal)",
      "Clients engage the brand, not just you",
    ],
  },
  {
    number: 4,
    icon: Crown,
    title: "Decentralized Structure",
    description:
      "Achieve true scalability. Your entity operates independently — work becomes deliverable by others under your brand.",
    details: [
      "5+ missions delivered by trained operators",
      "Structure handler manages operations",
      "Ownership shifts from person to entity",
      "Recurring revenue from brand equity",
    ],
  },
];

const entityForms = [
  {
    icon: Briefcase,
    label: "Boutique Firm",
    description: "A small, high-touch consulting firm built around your expertise and personal brand.",
  },
  {
    icon: Network,
    label: "Decentralized Expert Network",
    description: "A network of independent experts operating under a shared brand and methodology.",
  },
  {
    icon: Laptop,
    label: "Consulting Platform",
    description: "A digital platform that matches clients with vetted consultants using your frameworks.",
  },
  {
    icon: GraduationCap,
    label: "Training Academy",
    description: "An educational entity that teaches your methodology to the next generation of consultants.",
  },
];

const StartScaling = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageTransition>
        <main className="container mx-auto px-4 py-16 md:py-24">
          {/* Back button */}
          <div className="mb-6">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/consulting">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back to Consulting Path
              </Link>
            </Button>
          </div>

          {/* Hero */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-primary mb-4">
              <TrendingUp className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-4">
              Scale Your Structure
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Grow your consulting practice into a scalable entity. Build your brand, expand your reach, and create a business that works beyond your own time.
            </p>
          </div>

          {/* Scaling Phases */}
          <div className="max-w-3xl mx-auto space-y-6 mb-20">
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">Your Scaling Roadmap</h2>
            <p className="text-muted-foreground mb-6">
              From company formation to a fully decentralized consulting entity.
            </p>
            {scalingPhases.map((phase, idx) => (
              <Card
                key={phase.number}
                className="border-border hover:border-secondary/30 transition-all"
              >
                <CardContent className="p-6">
                  <div className="flex gap-5 items-start">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center text-primary-foreground font-bold text-lg shrink-0">
                        {phase.number}
                      </div>
                      {idx < scalingPhases.length - 1 && (
                        <div className="w-px h-6 bg-border mt-2" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <phase.icon className="w-5 h-5 text-accent" />
                        <h3 className="font-display text-xl font-bold text-foreground">
                          {phase.title}
                        </h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                        {phase.description}
                      </p>
                      <ul className="space-y-1">
                        {phase.details.map((detail) => (
                          <li
                            key={detail}
                            className="flex items-center gap-2 text-sm text-muted-foreground"
                          >
                            <CheckCircle className="w-4 h-4 text-accent shrink-0" />
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Build a Consulting Entity */}
          <div className="max-w-3xl mx-auto mb-20">
            <div className="text-center mb-8">
              <span className="inline-block text-secondary font-semibold text-sm uppercase tracking-wide mb-1">
                Choose Your Model
              </span>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">
                Build a Consulting Entity
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Your practice should work beyond your own time. Choose the entity form that fits your vision.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {entityForms.map((item) => (
                <Card
                  key={item.label}
                  className="border-border hover:border-secondary/30 transition-all"
                >
                  <CardContent className="p-5 flex gap-4 items-start">
                    <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
                      <item.icon className="w-5 h-5 text-secondary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">{item.label}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="max-w-3xl mx-auto text-center">
            <Card className="border-secondary/30 bg-secondary/5">
              <CardContent className="p-8">
                <h3 className="font-display text-xl font-bold text-foreground mb-2">
                  Ready to make it real?
                </h3>
                <p className="text-muted-foreground mb-5">
                  Access the full Advisory journey to track your progress across all scaling phases.
                </p>
                <Button asChild>
                  <Link to="/advisory">
                    Go to Advisory Hub <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </PageTransition>
      <Footer />
      <ScrollToTopButton />
    </div>
  );
};

export default StartScaling;
