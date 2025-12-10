import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Quote, TrendingUp, Users, Award, Briefcase } from "lucide-react";

const successStories = [
  {
    startup: "MediTrack Pro",
    box: "Box For Health",
    founder: "Sarah Chen",
    cobuilders: 4,
    equity: "Distributed across 5 roles",
    achievement: "Scaled to 50,000+ users in 8 months",
    quote: "B4 helped me find the perfect co-builders who believed in our vision. The equity model aligned everyone's interests from day one.",
    image: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=400&h=400&fit=crop",
  },
  {
    startup: "FarmFlow",
    box: "Box For Agriculture",
    founder: "Marcus Johnson",
    cobuilders: 3,
    equity: "Distributed across 4 roles",
    achievement: "Raised $2M seed funding",
    quote: "The Natural Role Decoder matched me with co-builders whose strengths complemented mine perfectly. We built something amazing together.",
    image: "https://images.unsplash.com/photo-1560493676-04071c5f467b?w=400&h=400&fit=crop",
  },
  {
    startup: "EduSpark",
    box: "Box For Education",
    founder: "Priya Patel",
    cobuilders: 5,
    equity: "Distributed across 6 roles",
    achievement: "Impacted 100,000+ students",
    quote: "Earning by Building wasn't just a program—it was a transformation. Our co-builders came in skilled and committed.",
    image: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=400&fit=crop",
  },
  {
    startup: "GreenBite",
    box: "Box For Food",
    founder: "Alex Rivera",
    cobuilders: 4,
    equity: "Distributed across 5 roles",
    achievement: "Expanded to 12 cities",
    quote: "The B4 model gave us structure without bureaucracy. Every co-builder owns a piece of our success.",
    image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop",
  },
];

const stats = [
  { icon: Briefcase, value: "50+", label: "Startups Launched" },
  { icon: Users, value: "200+", label: "Co-Builders Placed" },
  { icon: TrendingUp, value: "$15M+", label: "Total Funding Raised" },
  { icon: Award, value: "92%", label: "Success Rate" },
];

const Stories = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-20">
        {/* Hero Section */}
        <section className="py-20 md:py-28 relative overflow-hidden">
          <div className="absolute inset-0 gradient-hero opacity-50" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <span className="inline-block px-4 py-2 rounded-full bg-b4-coral/10 text-b4-coral text-sm font-medium mb-6">
                Success Stories
              </span>
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
                Real Teams. Real Impact.{" "}
                <span className="text-gradient">Real Success.</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                Discover how entrepreneurs and co-builders are building the future together 
                through equity-based collaboration on the B4 Platform.
              </p>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-12 border-y border-border bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="w-12 h-12 rounded-xl bg-b4-teal/10 flex items-center justify-center mx-auto mb-3">
                    <stat.icon className="w-6 h-6 text-b4-teal" />
                  </div>
                  <div className="font-display text-3xl md:text-4xl font-bold text-foreground mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stories Grid */}
        <section className="py-20 md:py-28">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-8">
              {successStories.map((story, index) => (
                <div 
                  key={index} 
                  className="group bg-card rounded-2xl border border-border overflow-hidden hover:shadow-xl transition-all duration-300 animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="aspect-video relative overflow-hidden">
                    <img 
                      src={story.image} 
                      alt={story.startup}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1 rounded-full bg-background/90 text-xs font-medium text-foreground">
                        {story.box}
                      </span>
                    </div>
                  </div>
                  <div className="p-6 md:p-8">
                    <h3 className="font-display text-2xl font-bold text-foreground mb-2">
                      {story.startup}
                    </h3>
                    <p className="text-b4-teal font-medium mb-4">{story.achievement}</p>
                    
                    <div className="flex items-start gap-3 mb-6">
                      <Quote className="w-8 h-8 text-b4-coral/30 flex-shrink-0" />
                      <p className="text-muted-foreground italic">"{story.quote}"</p>
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-border">
                      <div>
                        <p className="font-medium text-foreground">{story.founder}</p>
                        <p className="text-sm text-muted-foreground">Founder</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-foreground">{story.cobuilders} Co-Builders</p>
                        <p className="text-sm text-muted-foreground">{story.equity}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 md:py-28 gradient-primary">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-6">
                Ready to Write Your Success Story?
              </h2>
              <p className="text-primary-foreground/80 text-lg mb-8">
                Join B4 Platform today and start building your startup with a team that shares your vision and success.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="secondary" size="lg" asChild>
                  <Link to="/join?role=entrepreneur">
                    Start Your Startup
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
                  asChild
                >
                  <Link to="/join?role=cobuilder">Become a Co-Builder</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Stories;
