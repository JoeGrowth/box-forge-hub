import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/layout/PageTransition";
import { HeroSection } from "@/components/home/HeroSection";
import { BoxesSection } from "@/components/home/BoxesSection";
import { HowItWorksSection } from "@/components/home/HowItWorksSection";
import { ProgramsSection } from "@/components/home/ProgramsSection";
import { CTASection } from "@/components/home/CTASection";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageTransition>
        <main>
          <HeroSection />
          <BoxesSection />
          <HowItWorksSection />
          <ProgramsSection />
          <CTASection />
        </main>
      </PageTransition>
      <Footer />
    </div>
  );
};

export default Landing;
