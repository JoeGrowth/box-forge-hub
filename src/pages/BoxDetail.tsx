import { useParams, Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
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
  TrendingUp,
  Monitor,
  Smartphone,
  BarChart3,
  Shield,
  Zap,
  Globe
} from "lucide-react";

const boxesData: Record<string, {
  id: string;
  name: string;
  abbr: string;
  icon: typeof Heart;
  description: string;
  longDescription: string;
  color: string;
  bgColor: string;
  startups: number;
  cobuilders: number;
  totalRaised: string;
  fields: string[];
  featured: { name: string; desc: string }[];
  digitalSolutions: { icon: typeof Monitor; title: string; description: string }[];
  mission: string;
}> = {
  health: {
    id: "health",
    name: "Box For Health Solutions",
    abbr: "B4HS",
    icon: Heart,
    description: "Healthcare innovations that save lives and improve wellbeing.",
    longDescription: "From digital health platforms to medical devices, we nurture startups tackling humanity's most pressing health challenges. Our ecosystem brings together healthcare professionals, technologists, and visionaries to create solutions that transform patient care.",
    color: "from-rose-500 to-red-600",
    bgColor: "bg-rose-50",
    startups: 12,
    cobuilders: 45,
    totalRaised: "$1.2M",
    fields: ["Digital Health", "MedTech", "Mental Wellness", "Telemedicine"],
    featured: [
      { name: "HealthSync", desc: "AI-powered patient monitoring" },
      { name: "MindSpace", desc: "Mental health platform" },
      { name: "MediTrack", desc: "Medication adherence app" },
    ],
    digitalSolutions: [
      { icon: Monitor, title: "Telemedicine Platforms", description: "Connect patients with healthcare providers remotely through secure video consultations." },
      { icon: Smartphone, title: "Health Monitoring Apps", description: "Track vital signs, symptoms, and wellness metrics in real-time." },
      { icon: BarChart3, title: "Clinical Analytics", description: "AI-powered insights for better diagnosis and treatment planning." },
      { icon: Shield, title: "Health Data Security", description: "HIPAA-compliant solutions for protecting sensitive patient information." },
      { icon: Zap, title: "Emergency Response", description: "Fast-response systems for critical health emergencies." },
      { icon: Globe, title: "Global Health Access", description: "Solutions bridging healthcare gaps in underserved communities." },
    ],
    mission: "To democratize healthcare access and improve patient outcomes through innovative technology solutions.",
  },
  agriculture: {
    id: "agriculture",
    name: "Box For Agriculture Solutions",
    abbr: "B4AS",
    icon: Leaf,
    description: "Sustainable farming and food security solutions.",
    longDescription: "We support ventures revolutionizing how we grow, distribute, and consume food sustainably. Our focus is on technologies that increase yield, reduce environmental impact, and ensure food security for future generations.",
    color: "from-emerald-500 to-green-600",
    bgColor: "bg-emerald-50",
    startups: 8,
    cobuilders: 32,
    totalRaised: "$800K",
    fields: ["AgTech", "Precision Farming", "Supply Chain", "Vertical Farming"],
    featured: [
      { name: "FarmIQ", desc: "Smart farming analytics" },
      { name: "CropGuard", desc: "Pest prediction AI" },
      { name: "HarvestNet", desc: "Supply chain optimization" },
    ],
    digitalSolutions: [
      { icon: Monitor, title: "Farm Management Systems", description: "Centralized platforms for managing all farm operations efficiently." },
      { icon: Smartphone, title: "Field Monitoring Apps", description: "Real-time crop and soil monitoring via mobile devices." },
      { icon: BarChart3, title: "Yield Prediction Analytics", description: "AI models forecasting harvest outcomes and market prices." },
      { icon: Shield, title: "Crop Protection Systems", description: "Early warning systems for pest and disease detection." },
      { icon: Zap, title: "Smart Irrigation", description: "Automated water management for optimal crop growth." },
      { icon: Globe, title: "Market Access Platforms", description: "Connecting farmers directly with buyers worldwide." },
    ],
    mission: "To transform agriculture through technology, ensuring sustainable food production for a growing world population.",
  },
  education: {
    id: "education",
    name: "Box For Education Solutions",
    abbr: "B4ES",
    icon: GraduationCap,
    description: "Transforming learning experiences worldwide.",
    longDescription: "From EdTech platforms to skills training, we build the future of education. Our startups are reimagining how people learn, from early childhood through professional development.",
    color: "from-blue-500 to-indigo-600",
    bgColor: "bg-blue-50",
    startups: 10,
    cobuilders: 38,
    totalRaised: "$950K",
    fields: ["EdTech", "Skills Training", "E-Learning", "Career Development"],
    featured: [
      { name: "LearnPath", desc: "Personalized learning AI" },
      { name: "SkillForge", desc: "Professional upskilling" },
      { name: "EduConnect", desc: "Virtual classroom platform" },
    ],
    digitalSolutions: [
      { icon: Monitor, title: "Learning Management Systems", description: "Comprehensive platforms for course delivery and student tracking." },
      { icon: Smartphone, title: "Mobile Learning Apps", description: "Learn anywhere, anytime with optimized mobile experiences." },
      { icon: BarChart3, title: "Learning Analytics", description: "Data-driven insights to improve educational outcomes." },
      { icon: Shield, title: "Assessment Platforms", description: "Secure testing and certification systems." },
      { icon: Zap, title: "Adaptive Learning", description: "AI-powered personalization that adapts to each learner." },
      { icon: Globe, title: "Global Classrooms", description: "Virtual environments connecting students across borders." },
    ],
    mission: "To make quality education accessible to everyone, everywhere, through innovative technology.",
  },
  food: {
    id: "food",
    name: "Box For Food Solutions",
    abbr: "B4FS",
    icon: Utensils,
    description: "Food tech and sustainable nutrition solutions.",
    longDescription: "We support startups innovating in food production, delivery, and sustainability. Our portfolio includes ventures working on alternative proteins, reducing food waste, and improving nutrition access.",
    color: "from-amber-500 to-orange-600",
    bgColor: "bg-amber-50",
    startups: 6,
    cobuilders: 24,
    totalRaised: "$650K",
    fields: ["Food Tech", "Alternative Proteins", "Delivery", "Sustainability"],
    featured: [
      { name: "NutriFuture", desc: "Plant-based innovations" },
      { name: "FoodFlow", desc: "Smart distribution" },
      { name: "ZeroWaste", desc: "Food waste reduction" },
    ],
    digitalSolutions: [
      { icon: Monitor, title: "Kitchen Management", description: "Optimize restaurant and commercial kitchen operations." },
      { icon: Smartphone, title: "Ordering & Delivery Apps", description: "Seamless food ordering and delivery experiences." },
      { icon: BarChart3, title: "Supply Chain Tracking", description: "End-to-end visibility from farm to table." },
      { icon: Shield, title: "Food Safety Systems", description: "Compliance and quality assurance platforms." },
      { icon: Zap, title: "Smart Inventory", description: "AI-powered inventory management reducing waste." },
      { icon: Globe, title: "Marketplace Platforms", description: "Connecting food producers with consumers directly." },
    ],
    mission: "To revolutionize the food industry through technology that promotes sustainability and accessibility.",
  },
  realestate: {
    id: "realestate",
    name: "Box For Real Estate",
    abbr: "B4RE",
    icon: Building2,
    description: "PropTech and smart building innovations.",
    longDescription: "We nurture startups transforming how we buy, sell, build, and manage properties. From smart buildings to innovative financing models, our ventures are reshaping the real estate landscape.",
    color: "from-slate-500 to-gray-700",
    bgColor: "bg-slate-50",
    startups: 5,
    cobuilders: 20,
    totalRaised: "$500K",
    fields: ["PropTech", "Smart Buildings", "Real Estate Finance", "Construction Tech"],
    featured: [
      { name: "PropInsight", desc: "AI property valuation" },
      { name: "BuildSmart", desc: "Construction analytics" },
      { name: "SpaceFlow", desc: "Smart building management" },
    ],
    digitalSolutions: [
      { icon: Monitor, title: "Property Management", description: "Comprehensive platforms for managing real estate portfolios." },
      { icon: Smartphone, title: "Virtual Tours", description: "Immersive property viewing experiences from anywhere." },
      { icon: BarChart3, title: "Market Analytics", description: "Real-time property valuations and market trends." },
      { icon: Shield, title: "Smart Security", description: "IoT-powered building security and access control." },
      { icon: Zap, title: "Energy Management", description: "Optimize building energy consumption and costs." },
      { icon: Globe, title: "Investment Platforms", description: "Democratizing real estate investment opportunities." },
    ],
    mission: "To make real estate smarter, more accessible, and more sustainable through technology.",
  },
  tech: {
    id: "tech",
    name: "Box For Technology Solutions",
    abbr: "B4TS",
    icon: Cpu,
    description: "Deep tech and digital transformation ventures.",
    longDescription: "From AI to blockchain, we support cutting-edge technology startups. Our focus is on foundational technologies that will power the next generation of digital solutions across all industries.",
    color: "from-violet-500 to-purple-600",
    bgColor: "bg-violet-50",
    startups: 9,
    cobuilders: 41,
    totalRaised: "$1.1M",
    fields: ["AI/ML", "Blockchain", "SaaS", "Cybersecurity"],
    featured: [
      { name: "DataMind", desc: "Enterprise AI platform" },
      { name: "SecureChain", desc: "Blockchain security" },
      { name: "CloudScale", desc: "Scalable infrastructure" },
    ],
    digitalSolutions: [
      { icon: Monitor, title: "Enterprise Platforms", description: "Scalable SaaS solutions for business operations." },
      { icon: Smartphone, title: "Mobile Development", description: "Cross-platform mobile application development." },
      { icon: BarChart3, title: "AI & Machine Learning", description: "Intelligent automation and predictive analytics." },
      { icon: Shield, title: "Cybersecurity", description: "Advanced threat detection and data protection." },
      { icon: Zap, title: "Cloud Infrastructure", description: "Scalable and reliable cloud computing solutions." },
      { icon: Globe, title: "API Ecosystems", description: "Integration platforms connecting diverse systems." },
    ],
    mission: "To develop foundational technologies that empower innovation across all sectors.",
  },
};

const BoxDetail = () => {
  const { boxId } = useParams<{ boxId: string }>();
  const box = boxId ? boxesData[boxId] : null;

  if (!box) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-20 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h1 className="font-display text-4xl font-bold text-foreground mb-4">Box Not Found</h1>
            <p className="text-muted-foreground mb-6">The box you're looking for doesn't exist.</p>
            <Button asChild>
              <Link to="/boxes">View All Boxes</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const IconComponent = box.icon;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-20">
        {/* Hero */}
        <section className={`py-24 bg-gradient-to-br ${box.color} text-primary-foreground relative overflow-hidden`}>
          <div className="absolute inset-0 bg-black/20" />
          <div className="container mx-auto px-4 relative z-10">
            <Link to="/boxes" className="inline-flex items-center gap-2 text-primary-foreground/80 hover:text-primary-foreground mb-6 transition-colors">
              <ArrowRight className="w-4 h-4 rotate-180" />
              Back to Boxes
            </Link>
            <div className="max-w-3xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-20 h-20 rounded-2xl bg-primary-foreground/20 backdrop-blur-sm flex items-center justify-center">
                  <IconComponent className="w-10 h-10 text-primary-foreground" />
                </div>
                <div>
                  <span className="px-3 py-1 rounded-full bg-primary-foreground/20 text-sm font-medium">
                    {box.abbr}
                  </span>
                </div>
              </div>
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                {box.name}
              </h1>
              <p className="text-lg md:text-xl text-primary-foreground/90 max-w-2xl">
                {box.longDescription}
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 mt-12 max-w-2xl">
              <div className="bg-primary-foreground/10 backdrop-blur-sm rounded-xl p-4 text-center">
                <Rocket className="w-6 h-6 mx-auto mb-2 text-primary-foreground/80" />
                <div className="text-3xl font-bold">{box.startups}</div>
                <div className="text-sm text-primary-foreground/70">Startups</div>
              </div>
              <div className="bg-primary-foreground/10 backdrop-blur-sm rounded-xl p-4 text-center">
                <Users className="w-6 h-6 mx-auto mb-2 text-primary-foreground/80" />
                <div className="text-3xl font-bold">{box.cobuilders}</div>
                <div className="text-sm text-primary-foreground/70">Co-Builders</div>
              </div>
              <div className="bg-primary-foreground/10 backdrop-blur-sm rounded-xl p-4 text-center">
                <TrendingUp className="w-6 h-6 mx-auto mb-2 text-primary-foreground/80" />
                <div className="text-3xl font-bold">{box.totalRaised}</div>
                <div className="text-sm text-primary-foreground/70">Raised</div>
              </div>
            </div>
          </div>
        </section>

        {/* Mission */}
        <section className="py-16 bg-muted/50">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">Our Mission</h2>
              <p className="text-lg text-muted-foreground">{box.mission}</p>
            </div>
          </div>
        </section>

        {/* Focus Areas */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">Focus Areas</h2>
            <div className="flex flex-wrap justify-center gap-3">
              {box.fields.map((field) => (
                <span key={field} className={`px-6 py-3 rounded-full ${box.bgColor} text-foreground font-medium`}>
                  {field}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Digital Solutions */}
        <section className="py-24 bg-card">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <span className="inline-block px-4 py-1 rounded-full bg-b4-teal/10 text-b4-teal text-sm font-medium mb-4">
                Innovation Hub
              </span>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
                Digital Solutions
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Technology-driven solutions our startups are building to transform the {box.name.replace("Box For ", "").toLowerCase()} sector.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {box.digitalSolutions.map((solution, i) => {
                const SolutionIcon = solution.icon;
                return (
                  <div 
                    key={solution.title}
                    className="bg-background rounded-2xl p-6 border border-border hover:border-b4-teal/50 hover:shadow-lg transition-all duration-300 animate-fade-in"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  >
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${box.color} flex items-center justify-center mb-4`}>
                      <SolutionIcon className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <h3 className="font-display font-semibold text-lg text-foreground mb-2">{solution.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{solution.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Featured Startups */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
                Featured Startups
              </h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Meet some of the innovative ventures building the future within {box.abbr}.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {box.featured.map((startup, i) => (
                <div 
                  key={startup.name}
                  className="bg-card rounded-2xl p-6 border border-border hover:shadow-lg transition-all duration-300 animate-fade-in text-center"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${box.color} flex items-center justify-center mx-auto mb-4`}>
                    <Rocket className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <h3 className="font-display font-semibold text-xl text-foreground mb-2">{startup.name}</h3>
                  <p className="text-muted-foreground text-sm">{startup.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className={`py-24 bg-gradient-to-br ${box.color} text-primary-foreground`}>
          <div className="container mx-auto px-4 text-center">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Ready to Build With Us?
            </h2>
            <p className="text-primary-foreground/80 text-lg max-w-2xl mx-auto mb-8">
              Join {box.abbr} and help create the next generation of {box.name.replace("Box For ", "").toLowerCase()} solutions.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button variant="secondary" size="lg" asChild>
                <Link to="/join?role=entrepreneur">
                  Submit Your Startup <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10" asChild>
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

export default BoxDetail;