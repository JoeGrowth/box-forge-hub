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
  },
  {
    id: "agriculture",
    name: "Box For Agriculture",
    abbr: "B4AS",
    icon: Leaf,
    description: "Sustainable farming and food security solutions.",
    startups: 8,
  },
  {
    id: "education",
    name: "Box For Education",
    abbr: "B4ES",
    icon: GraduationCap,
    description: "Transforming learning experiences worldwide.",
    startups: 10,
  },
  {
    id: "food",
    name: "Box For Food",
    abbr: "B4FS",
    icon: Utensils,
    description: "Food tech and sustainable nutrition solutions.",
    startups: 6,
  },
  {
    id: "realestate",
    name: "Box For Real Estate",
    abbr: "B4RE",
    icon: Building2,
    description: "PropTech and smart building innovations.",
    startups: 5,
  },
  {
    id: "tech",
    name: "Box For Technology",
    abbr: "B4TS",
    icon: Cpu,
    description: "Deep tech and digital transformation ventures.",
    startups: 9,
  },
];

export function BoxesSection() {
  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Our Ecosystem
          </span>
          <h2 className="text-3xl md:text-4xl font-semibold text-foreground mb-4">
            Box For Entities
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Specialized units focused on solving real-world problems across different sectors. 
            Each box nurtures startups in its domain.
          </p>
        </div>

        {/* Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {boxes.map((box) => (
            <Link
              key={box.id}
              to={`/boxes/${box.id}`}
              className="group bg-card rounded-lg p-5 border hover:border-primary/30 transition-all hover:shadow-elevated"
            >
              <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                <box.icon className="w-5 h-5 text-primary" />
              </div>
              
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-medium text-foreground">{box.name}</h3>
                <span className="px-1.5 py-0.5 rounded bg-muted text-xs text-muted-foreground">
                  {box.abbr}
                </span>
              </div>
              
              <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
                {box.description}
              </p>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{box.startups}</span> startups
                </span>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <Button variant="outline" asChild>
            <Link to="/boxes">
              Explore All Boxes
              <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
