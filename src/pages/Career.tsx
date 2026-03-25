import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ScrollToTopButton } from "@/components/layout/ScrollToTopButton";
import { PageTransition } from "@/components/layout/PageTransition";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Compass, ShoppingBag, GraduationCap, BookOpen, FileText, Briefcase, Users, ArrowRight, ArrowLeft } from "lucide-react";

const steps = [
  {
    number: 1,
    icon: Compass,
    title: "Know What You Do",
    description:
      "Discover your Natural Role based on your strengths, personality and LinkedIn profile. Understand what makes you unique.",
    link: "/decoder",
    cta: "Decode Your Role",
  },
  {
    number: 2,
    icon: ShoppingBag,
    title: "Shape What You Do",
    description:
      "Build your professional resume and track record to showcase your expertise and attract opportunities.",
    link: "/resume",
    cta: "Build Your Resume",
  },
  {
    number: 3,
    icon: Users,
    title: "Join a Team",
    description:
      "Browse team environments looking for talent. Apply for roles that match your Natural Role and join an existing organization.",
    link: "/opportunities?tab=environments",
    cta: "Browse Environments",
  },
  {
    number: 4,
    icon: GraduationCap,
    title: "Strengthen What You Do",
    description:
      "Browse available trainings from other experts and level up your skills in areas that matter to you.",
    link: "/opportunities?tab=trainings",
    cta: "Browse Trainings",
  },
  {
    number: 5,
    icon: BookOpen,
    title: "Propose a Training",
    description:
      "Package your expertise into a training offer. Share your knowledge and earn revenue by teaching others.",
    link: "/resume",
    cta: "Create Training",
  },
  {
    number: 6,
    icon: Briefcase,
    title: "Propose a Service",
    description:
      "Offer your professional services on the platform. Define your expertise, set your terms, and attract clients.",
    link: "/resume",
    cta: "Create Service",
  },
  {
    number: 7,
    icon: FileText,
    title: "Apply for a Tender",
    description:
      "Find consulting and project tenders that match your Natural Role and apply with your track record.",
    link: "/opportunities?tab=tenders",
    cta: "View Tenders",
  },
];

const Career = () => {
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
              Career Path
            </span>
            <h1 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-4">
              Build & Monetize Your Expertise
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Follow these steps to discover, package, and sell your skills.
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-6">
            {steps.map((step) => (
              <div
                key={step.number}
                className="flex gap-6 items-start p-6 rounded-2xl border border-border bg-card hover:border-secondary/30 transition-all"
              >
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground font-bold text-lg shrink-0">
                    {step.number}
                  </div>
                  {step.number < steps.length && <div className="w-px h-6 bg-border mt-2" />}
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
              </div>
            ))}
          </div>
        </main>
      </PageTransition>
      <Footer />
    </div>
  );
};

export default Career;
