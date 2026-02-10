import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Rocket, ArrowLeft } from "lucide-react";

const ComingSoon = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20">
        <section className="py-24">
          <div className="container max-w-2xl mx-auto px-4 text-center">
            <div className="w-20 h-20 rounded-2xl bg-b4-teal/10 text-b4-teal flex items-center justify-center mx-auto mb-8">
              <Rocket className="w-10 h-10" />
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
              Something is cooking! 🍳
            </h1>
            <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto">
              We're working hard to bring this feature to life. Stay tuned for updates!
            </p>
            <Button size="lg" onClick={() => navigate("/")} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default ComingSoon;
