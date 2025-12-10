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
    color: "from-rose-500 to-red-600",
    startups: 12,
  },
  {
    id: "agriculture",
    name: "Box For Agriculture",
    abbr: "B4AS",
    icon: Leaf,
    description: "Sustainable farming and food security solutions.",
    color: "from-emerald-500 to-green-600",
    startups: 8,
  },
  {
    id: "education",
    name: "Box For Education",
    abbr: "B4ES",
    icon: GraduationCap,
    description: "Transforming learning experiences worldwide.",
    color: "from-blue-500 to-indigo-600",
    startups: 10,
  },
  {
    id: "food",
    name: "Box For Food",
    abbr: "B4FS",
    icon: Utensils,
    description: "Food tech and sustainable nutrition solutions.",
    color: "from-amber-500 to-orange-600",
    startups: 6,
  },
  {
    id: "realestate",
    name: "Box For Real Estate",
    abbr: "B4RE",
    icon: Building2,
    description: "PropTech and smart building innovations.",
    color: "from-slate-500 to-gray-700",
    startups: 5,
  },
  {
    id: "tech",
    name: "Box For Technology",
    abbr: "B4TS",
    icon: Cpu,
    description: "Deep tech and digital transformation ventures.",
    color: "from-violet-500 to-purple-600",
    startups: 9,
  },
];

export function BoxesSection() {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1 rounded-full bg-b4-teal/10 text-b4-teal text-sm font-medium mb-4">
            Our Ecosystem
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Box For Entities
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Specialized units focused on solving real-world problems across different sectors. 
            Each box nurtures startups in its domain.
          </p>
        </div>

        {/* Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {boxes.map((box, i) => (
            <Link
              key={box.id}
              to={`/boxes/${box.id}`}
              className="group relative bg-card rounded-2xl p-6 border border-border hover:border-b4-teal/50 transition-all duration-300 hover:shadow-xl hover:shadow-b4-teal/10 hover:-translate-y-1 animate-fade-in"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${box.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <box.icon className="w-7 h-7 text-primary-foreground" />
              </div>
              
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-display font-semibold text-xl text-foreground">{box.name}</h3>
                <span className="px-2 py-0.5 rounded-md bg-muted text-xs font-medium text-muted-foreground">
                  {box.abbr}
                </span>
              </div>
              
              <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
                {box.description}
              </p>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  <span className="font-semibold text-b4-teal">{box.startups}</span> startups
                </span>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-b4-teal group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <Button variant="outline" size="lg" asChild>
            <Link to="/boxes">
              Explore All Boxes <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
