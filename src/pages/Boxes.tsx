import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { 
  Heart, 
  Leaf, 
  GraduationCap, 
  Utensils, 
  Building2, 
  Cpu,
  ArrowRight,
  Users,
  Rocket,
  TrendingUp
} from "lucide-react";

const boxes = [
  {
    id: "health",
    name: "Box For Health Solutions",
    abbr: "B4HS",
    icon: Heart,
    description: "Healthcare innovations that save lives and improve wellbeing. From digital health platforms to medical devices, we nurture startups tackling humanity's most pressing health challenges.",
    color: "from-rose-500 to-red-600",
    bgColor: "bg-rose-50",
    startups: 12,
    cobuilders: 45,
    totalRaised: "$1.2M",
    fields: ["Digital Health", "MedTech", "Mental Wellness", "Telemedicine"],
    featured: [
      { name: "HealthSync", desc: "AI-powered patient monitoring" },
      { name: "MindSpace", desc: "Mental health platform" },
    ],
  },
  {
    id: "agriculture",
    name: "Box For Agriculture Solutions",
    abbr: "B4AS",
    icon: Leaf,
    description: "Sustainable farming and food security solutions. We support ventures revolutionizing how we grow, distribute, and consume food sustainably.",
    color: "from-emerald-500 to-green-600",
    bgColor: "bg-emerald-50",
    startups: 8,
    cobuilders: 32,
    totalRaised: "$800K",
    fields: ["AgTech", "Precision Farming", "Supply Chain", "Vertical Farming"],
    featured: [
      { name: "FarmIQ", desc: "Smart farming analytics" },
      { name: "CropGuard", desc: "Pest prediction AI" },
    ],
  },
  {
    id: "education",
    name: "Box For Education Solutions",
    abbr: "B4ES",
    icon: GraduationCap,
    description: "Transforming learning experiences worldwide. From EdTech platforms to skills training, we build the future of education.",
    color: "from-blue-500 to-indigo-600",
    bgColor: "bg-blue-50",
    startups: 10,
    cobuilders: 38,
    totalRaised: "$950K",
    fields: ["EdTech", "Skills Training", "E-Learning", "Career Development"],
    featured: [
      { name: "LearnPath", desc: "Personalized learning AI" },
      { name: "SkillForge", desc: "Professional upskilling" },
    ],
  },
  {
    id: "food",
    name: "Box For Food Solutions",
    abbr: "B4FS",
    icon: Utensils,
    description: "Food tech and sustainable nutrition solutions. We support startups innovating in food production, delivery, and sustainability.",
    color: "from-amber-500 to-orange-600",
    bgColor: "bg-amber-50",
    startups: 6,
    cobuilders: 24,
    totalRaised: "$650K",
    fields: ["Food Tech", "Alternative Proteins", "Delivery", "Sustainability"],
    featured: [
      { name: "NutriFuture", desc: "Plant-based innovations" },
      { name: "FoodFlow", desc: "Smart distribution" },
    ],
  },
  {
    id: "realestate",
    name: "Box For Real Estate",
    abbr: "B4RE",
    icon: Building2,
    description: "PropTech and smart building innovations. We nurture startups transforming how we buy, sell, build, and manage properties.",
    color: "from-slate-500 to-gray-700",
    bgColor: "bg-slate-50",
    startups: 5,
    cobuilders: 20,
    totalRaised: "$500K",
    fields: ["PropTech", "Smart Buildings", "Real Estate Finance", "Construction Tech"],
    featured: [
      { name: "PropInsight", desc: "AI property valuation" },
      { name: "BuildSmart", desc: "Construction analytics" },
    ],
  },
  {
    id: "tech",
    name: "Box For Technology Solutions",
    abbr: "B4TS",
    icon: Cpu,
    description: "Deep tech and digital transformation ventures. From AI to blockchain, we support cutting-edge technology startups.",
    color: "from-violet-500 to-purple-600",
    bgColor: "bg-violet-50",
    startups: 9,
    cobuilders: 41,
    totalRaised: "$1.1M",
    fields: ["AI/ML", "Blockchain", "SaaS", "Cybersecurity"],
    featured: [
      { name: "DataMind", desc: "Enterprise AI platform" },
      { name: "SecureChain", desc: "Blockchain security" },
    ],
  },
];

const Boxes = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-20">
        {/* Hero */}
        <section className="py-24 gradient-hero text-primary-foreground">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl">
              <span className="inline-block px-4 py-1 rounded-full bg-primary-foreground/10 text-sm font-medium mb-6">
                Our Ecosystem
              </span>
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                Box For Entities
              </h1>
              <p className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl">
                Specialized units focused on solving real-world problems. Each Box nurtures 
                startups within its domain, providing focused expertise and mentorship.
              </p>
            </div>
          </div>
        </section>

        {/* Boxes Grid */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <div className="space-y-12">
              {boxes.map((box, i) => (
                <div 
                  key={box.id}
                  className="bg-card rounded-3xl border border-border overflow-hidden hover:shadow-xl transition-all duration-500 animate-fade-in"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <div className={`h-2 bg-gradient-to-r ${box.color}`} />
                  
                  <div className="p-8 md:p-12">
                    <div className="grid lg:grid-cols-3 gap-8">
                      {/* Main info */}
                      <div className="lg:col-span-2">
                        <div className="flex items-start gap-4 mb-6">
                          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${box.color} flex items-center justify-center flex-shrink-0`}>
                            <box.icon className="w-8 h-8 text-primary-foreground" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h2 className="font-display font-bold text-2xl text-foreground">{box.name}</h2>
                              <span className="px-2 py-0.5 rounded-md bg-muted text-xs font-medium text-muted-foreground">
                                {box.abbr}
                              </span>
                            </div>
                            <p className="text-muted-foreground">{box.description}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-6">
                          {box.fields.map((field) => (
                            <span key={field} className={`px-3 py-1 rounded-full ${box.bgColor} text-sm font-medium`}>
                              {field}
                            </span>
                          ))}
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-6">
                          <div className="flex items-center gap-2">
                            <Rocket className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm"><strong>{box.startups}</strong> startups</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm"><strong>{box.cobuilders}</strong> co-builders</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm"><strong>{box.totalRaised}</strong> raised</span>
                          </div>
                        </div>
                      </div>

                      {/* Featured startups */}
                      <div className="bg-muted/50 rounded-2xl p-6">
                        <h4 className="font-semibold text-sm text-foreground mb-4">Featured Startups</h4>
                        <div className="space-y-3">
                          {box.featured.map((startup) => (
                            <div key={startup.name} className="bg-card rounded-lg p-3">
                              <div className="font-medium text-foreground">{startup.name}</div>
                              <div className="text-sm text-muted-foreground">{startup.desc}</div>
                            </div>
                          ))}
                        </div>
                        <Button variant="outline" size="sm" className="w-full mt-4" asChild>
                          <Link to={`/boxes/${box.id}`}>
                            View All <ArrowRight className="ml-2 w-3 h-3" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 bg-muted/50">
          <div className="container mx-auto px-4 text-center">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
              Ready to Join a Box?
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
              Whether you have a startup idea or want to contribute as a co-builder, 
              there's a place for you in our ecosystem.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button variant="default" size="lg" asChild>
                <Link to="/join?role=entrepreneur">
                  Submit Your Startup <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link to="/join?role=cobuilder">
                  Become a Co-Builder
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

export default Boxes;
