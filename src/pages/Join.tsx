import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ApplicationForm } from "@/components/join/ApplicationForm";
import { 
  User, 
  Building2,
  Rocket,
  Award,
  Handshake
} from "lucide-react";

type Role = "person" | "organization";

const roles: { id: Role; icon: typeof User; title: string; subtitle: string }[] = [
  {
    id: "person",
    icon: User,
    title: "Person",
    subtitle: "Run with us",
  },
  {
    id: "organization",
    icon: Building2,
    title: "Organization",
    subtitle: "Collaborate with us",
  },
];

const Join = () => {
  const [searchParams] = useSearchParams();
  const initialRole = (searchParams.get("role") as Role) || "person";
  const [selectedRole, setSelectedRole] = useState<Role>(initialRole);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-20">
        {/* Hero */}
        <section className="py-16 gradient-hero text-primary-foreground">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl">
              <span className="inline-block px-4 py-1 rounded-full bg-primary-foreground/10 text-sm font-medium mb-6">
                Join the Movement
              </span>
              <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
                Start Your Journey
              </h1>
              <p className="text-lg text-primary-foreground/80 max-w-2xl">
                Whether you're an individual ready to build or an organization 
                looking to collaborate, there's a place for you at B4 Platform.
              </p>
            </div>
          </div>
        </section>

        {/* Role Selection & Form */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12">
              {/* Role Selection */}
              <div>
                <h2 className="font-display text-2xl font-bold text-foreground mb-6">
                  I want to join as:
                </h2>
                
                <div className="grid grid-cols-2 gap-4">
                  {roles.map((role) => (
                    <button
                      key={role.id}
                      onClick={() => setSelectedRole(role.id)}
                      className={`text-left p-6 rounded-2xl border-2 transition-all ${
                        selectedRole === role.id
                          ? "border-b4-teal bg-b4-teal/5"
                          : "border-border bg-card hover:border-muted-foreground/30"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
                        selectedRole === role.id 
                          ? "bg-b4-teal text-primary-foreground" 
                          : "bg-muted text-muted-foreground"
                      }`}>
                        <role.icon className="w-5 h-5" />
                      </div>
                      <h3 className="font-semibold text-lg text-foreground">{role.title}</h3>
                      <p className="text-sm text-b4-teal">{role.subtitle}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Application Form */}
              <div>
                <ApplicationForm selectedRole={selectedRole} />
              </div>
            </div>
          </div>
        </section>

        {/* Trust section */}
        <section className="py-16 bg-muted/50">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {[
                { icon: Rocket, stat: "50+", label: "Startups Launched" },
                { icon: Award, stat: "200+", label: "Active Co-Builders" },
                { icon: Handshake, stat: "$2.5M", label: "Equity Distributed" },
              ].map((item) => (
                <div key={item.label} className="text-center">
                  <div className="w-14 h-14 rounded-xl bg-b4-teal/10 flex items-center justify-center mx-auto mb-4">
                    <item.icon className="w-7 h-7 text-b4-teal" />
                  </div>
                  <div className="text-3xl font-bold text-foreground mb-1">{item.stat}</div>
                  <div className="text-sm text-muted-foreground">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Join;
