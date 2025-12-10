import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { BoxesSection } from "@/components/home/BoxesSection";
import { HowItWorksSection } from "@/components/home/HowItWorksSection";
import { ProgramsSection } from "@/components/home/ProgramsSection";
import { CTASection } from "@/components/home/CTASection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <BoxesSection />
        <HowItWorksSection />
        <ProgramsSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
