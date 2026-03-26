import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ScrollToTopButton } from "@/components/layout/ScrollToTopButton";
import { PageTransition } from "@/components/layout/PageTransition";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  Layers,
  Target,
  FileText,
  Globe,
  Briefcase,
  CheckCircle,
  ArrowRight,
  Lightbulb,
  BookOpen,
  Wrench,
  Package,
} from "lucide-react";

const structuringPhases = [
  {
    number: 1,
    icon: Target,
    title: "Define Your Core Services",
    description:
      "Identify the 3–5 services that best represent your natural role. Clarify your methodology, your unique approach, and the outcomes you deliver.",
    details: [
      "Map your expertise to client needs",
      "Define clear deliverables for each service",
      "Set pricing frameworks (per day, per project, retainer)",
    ],
  },
  {
    number: 2,
    icon: FileText,
    title: "Build Your Proposal Template",
    description:
      "Create a reusable proposal structure that communicates your value proposition consistently. Include scope, timeline, pricing, and terms.",
    details: [
      "Executive summary template",
      "Scope of work framework",
      "Standard terms & conditions",
    ],
  },
  {
    number: 3,
    icon: Globe,
    title: "Establish Your Presence",
    description:
      "Set up a professional digital presence — a website or landing page that showcases your services, methodology, and track record.",
    details: [
      "Professional website or portfolio",
      "Case studies from past missions",
      "Testimonials and social proof",
    ],
  },
  {
    number: 4,
    icon: Briefcase,
    title: "Deliver Your First 10 Missions",
    description:
      "Build a solid foundation by completing missions independently. Document learnings, refine your process, and collect client feedback.",
    details: [
      "Track all missions delivered",
      "Gather client testimonials",
      "Refine your methodology with each engagement",
    ],
  },
];

const productIdeas = [
  {
    icon: BookOpen,
    label: "Frameworks & Playbooks",
    description: "Turn your consulting methodology into a documented, teachable framework.",
  },
  {
    icon: Wrench,
    label: "Software & Tools",
    description: "Build or curate tools that automate parts of your consulting delivery.",
  },
  {
    icon: Package,
    label: "Datasets & Methodologies",
    description: "Package proprietary data, benchmarks, or assessment methodologies for licensing.",
  },
  {
    icon: Lightbulb,
    label: "Training Courses",
    description: "Convert your expertise into structured training programs with recurring enrollment.",
  },
];

const StartStructuring = () => {
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
              <Layers className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-4">
              Structure What You Do
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Turn your expertise into a structured consulting offer. Define your services, methodology, and value proposition in a clear framework.
            </p>
          </div>

          {/* Structuring Phases */}
          <div className="max-w-3xl mx-auto space-y-6 mb-20">
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">Your Structuring Roadmap</h2>
            <p className="text-muted-foreground mb-6">
              Follow these four phases to go from individual expertise to a structured practice.
            </p>
            {structuringPhases.map((phase, idx) => (
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
                      {idx < structuringPhases.length - 1 && (
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

          {/* Turn Expertise into Products */}
          <div className="max-w-3xl mx-auto mb-20">
            <div className="text-center mb-8">
              <span className="inline-block text-secondary font-semibold text-sm uppercase tracking-wide mb-1">
                Beyond Services
              </span>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">
                Turn Expertise into Products
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Knowledge → Product → Recurring Revenue. Package what you know into assets that generate value beyond your time.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {productIdeas.map((item) => (
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
                  Ready to go further?
                </h3>
                <p className="text-muted-foreground mb-5">
                  Once your practice is structured, scale it into an independent entity.
                </p>
                <Button asChild>
                  <Link to="/startscaling">
                    Start Scaling <ArrowRight className="w-4 h-4 ml-1" />
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

export default StartStructuring;
