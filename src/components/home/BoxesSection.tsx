import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Heart, 
  Leaf, 
  GraduationCap, 
  Utensils, 
  Building2, 
  Cpu,
  ArrowRight 
} from "lucide-react";

const boxes = [
  {
    id: "health",
    name: "Box For Health",
    abbr: "B4HS",
    icon: Heart,
    description: "Healthcare innovations that save lives and improve wellbeing.",
    startups: 12,
    gradient: "from-red-500 to-pink-500",
  },
  {
    id: "agriculture",
    name: "Box For Agriculture",
    abbr: "B4AS",
    icon: Leaf,
    description: "Sustainable farming and food security solutions.",
    startups: 8,
    gradient: "from-green-500 to-emerald-500",
  },
  {
    id: "education",
    name: "Box For Education",
    abbr: "B4ES",
    icon: GraduationCap,
    description: "Transforming learning experiences worldwide.",
    startups: 10,
    gradient: "from-blue-500 to-indigo-500",
  },
  {
    id: "food",
    name: "Box For Food",
    abbr: "B4FS",
    icon: Utensils,
    description: "Food tech and sustainable nutrition solutions.",
    startups: 6,
    gradient: "from-orange-500 to-amber-500",
  },
  {
    id: "realestate",
    name: "Box For Real Estate",
    abbr: "B4RE",
    icon: Building2,
    description: "PropTech and smart building innovations.",
    startups: 5,
    gradient: "from-purple-500 to-violet-500",
  },
  {
    id: "tech",
    name: "Box For Technology",
    abbr: "B4TS",
    icon: Cpu,
    description: "Deep tech and digital transformation ventures.",
    startups: 9,
    gradient: "from-cyan-500 to-teal-500",
  },
];

export function BoxesSection() {
  return (
    <section className="py-20 md:py-28 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            Our Ecosystem
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Box For Entities
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Specialized units focused on solving real-world problems across different sectors. 
            Each box nurtures startups in its domain.
          </p>
        </div>

        {/* Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {boxes.map((box) => (
            <Link
              key={box.id}
              to={`/boxes/${box.id}`}
              className="group bg-card rounded-2xl p-6 border border-border hover:border-primary/30 transition-all duration-300 hover:shadow-elevated"
            >
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${box.gradient} flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-300 shadow-soft`}>
                <box.icon className="w-7 h-7 text-white" />
              </div>
              
              <div className="flex items-center gap-3 mb-3">
                <h3 className="font-semibold text-lg text-foreground">{box.name}</h3>
                <span className="px-2 py-1 rounded-md bg-muted text-xs font-medium text-muted-foreground">
                  {box.abbr}
                </span>
              </div>
              
              <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                {box.description}
              </p>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{box.startups}</span> startups
                </span>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
              </div>
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <Button variant="outline" size="lg" asChild>
            <Link to="/boxes">
              Explore All Boxes
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
