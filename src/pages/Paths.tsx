import { Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/layout/PageTransition";
import { ArrowRight, Briefcase, Lightbulb, Building2 } from "lucide-react";

const paths = [
  {
    icon: Briefcase,
    title: "Career",
    subtitle: "Build & monetize your expertise",
    description:
      "Discover your natural role, showcase your skills, propose or join trainings, and apply for tenders.",
    link: "/career",
    gradient: "from-primary to-secondary",
  },
  {
    icon: Lightbulb,
    title: "Entrepreneurship",
    subtitle: "Launch or join a venture",
    description:
      "Create your own startup project or join an existing one as a co-builder with equity.",
    link: "/entrepreneurship",
    gradient: "from-secondary to-accent",
  },
  {
    icon: Building2,
    title: "Consulting",
    subtitle: "Scale your practice",
    description:
      "Structure your expertise into a consulting offer and scale it into an independent practice.",
    link: "/consulting",
    gradient: "from-accent to-primary",
  },
];

const Paths = () => {
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
            {paths.map((path) => (
              <Link
                key={path.title}
                to={path.link}
                className="group relative rounded-2xl border border-border bg-card p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-secondary/30"
              >
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
            ))}
          </div>
        </main>
      </PageTransition>
      <Footer />
    </div>
  );
};

export default Paths;
