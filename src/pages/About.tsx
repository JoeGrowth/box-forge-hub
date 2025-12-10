import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Target, Users, Lightbulb, Globe, ArrowRight, CheckCircle } from "lucide-react";

const values = [
  {
    icon: Target,
    title: "Purpose-Driven",
    description: "We build businesses that solve real problems and create lasting impact.",
  },
  {
    icon: Users,
    title: "Collaborative",
    description: "Success comes from bringing together diverse talents and perspectives.",
  },
  {
    icon: Lightbulb,
    title: "Innovative",
    description: "We challenge traditional models and create new pathways to entrepreneurship.",
  },
  {
    icon: Globe,
    title: "Global Impact",
    description: "Our startups address challenges that affect communities worldwide.",
  },
];

const stats = [
  { value: "$2.5M+", label: "Equity Distributed" },
  { value: "50+", label: "Startups Launched" },
  { value: "200+", label: "Active Co-Builders" },
  { value: "6", label: "Specialized Boxes" },
];

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-20">
        {/* Hero */}
        <section className="py-24 gradient-hero text-primary-foreground">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl">
              <span className="inline-block px-4 py-1 rounded-full bg-primary-foreground/10 text-sm font-medium mb-6">
                About B4 Platform
              </span>
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                Reimagining How
                <br />
                <span className="text-gradient">Startups Are Built</span>
              </h1>
              <p className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl">
                B4 Platform is a revolutionary ecosystem where entrepreneurs and co-builders 
                come together to create impactful startups through equity-based collaboration.
              </p>
            </div>
          </div>
        </section>

        {/* Story */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <span className="inline-block px-4 py-1 rounded-full bg-b4-teal/10 text-b4-teal text-sm font-medium mb-4">
                  Our Story
                </span>
                <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
                  From Vision to Reality
                </h2>
                <div className="space-y-4 text-muted-foreground leading-relaxed">
                  <p>
                    B4 Platform was born from a simple observation: the traditional startup model 
                    excludes talented individuals who lack capital but have invaluable skills.
                  </p>
                  <p>
                    We created a new paradigm—one where contribution equals ownership. Where a 
                    developer, designer, or strategist can build real equity through their work, 
                    not just earn a salary.
                  </p>
                  <p>
                    Our "Box For" model organizes startups into specialized units (Health, Agriculture, 
                    Education, and more), ensuring each venture gets focused expertise and mentorship.
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {stats.map((stat, i) => (
                  <div 
                    key={stat.label}
                    className="bg-card rounded-2xl p-6 border border-border text-center animate-fade-in"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  >
                    <div className="text-3xl md:text-4xl font-bold text-b4-teal mb-2">{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="py-24 bg-muted/50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <span className="inline-block px-4 py-1 rounded-full bg-b4-coral/10 text-b4-coral text-sm font-medium mb-4">
                Our Values
              </span>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
                What Drives Us
              </h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {values.map((value, i) => (
                <div 
                  key={value.title}
                  className="bg-card rounded-2xl p-6 border border-border hover:border-b4-teal/30 transition-all animate-fade-in"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <div className="w-12 h-12 rounded-xl bg-b4-navy/10 flex items-center justify-center mb-4">
                    <value.icon className="w-6 h-6 text-b4-navy" />
                  </div>
                  <h3 className="font-semibold text-lg text-foreground mb-2">{value.title}</h3>
                  <p className="text-sm text-muted-foreground">{value.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Model */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <span className="inline-block px-4 py-1 rounded-full bg-b4-navy/10 text-b4-navy text-sm font-medium mb-4">
                The B4 Model
              </span>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
                Equity-Based Collaboration
              </h2>
              <p className="text-muted-foreground text-lg">
                Our unique model ensures everyone who contributes to building a startup 
                becomes a true stakeholder in its success.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="bg-card rounded-2xl p-8 border border-border">
                <h3 className="font-semibold text-xl text-foreground mb-4">For Entrepreneurs</h3>
                <ul className="space-y-3">
                  {[
                    "Launch without needing upfront capital",
                    "Access a pool of vetted co-builders",
                    "Structured guidance through our Box system",
                    "Fair equity distribution framework",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-muted-foreground">
                      <CheckCircle className="w-5 h-5 text-b4-teal flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-card rounded-2xl p-8 border border-border">
                <h3 className="font-semibold text-xl text-foreground mb-4">For Co-Builders</h3>
                <ul className="space-y-3">
                  {[
                    "Earn equity instead of just salary",
                    "Build a portfolio of startup investments",
                    "Work on problems that matter to you",
                    "Certified training and mentorship",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-muted-foreground">
                      <CheckCircle className="w-5 h-5 text-b4-coral flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="text-center mt-12">
              <Button variant="default" size="lg" asChild>
                <Link to="/join">
                  Join the Platform <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default About;
