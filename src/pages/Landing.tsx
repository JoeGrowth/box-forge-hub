import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { PageTransition } from "@/components/layout/PageTransition";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingProblem } from "@/components/landing/LandingProblem";
import { LandingHowItWorks } from "@/components/landing/LandingHowItWorks";
import { LandingPaths } from "@/components/landing/LandingPaths";
import { LandingStats } from "@/components/landing/LandingStats";
import { LandingTestimonials } from "@/components/landing/LandingTestimonials";
import { LandingFAQ } from "@/components/landing/LandingFAQ";
import { LandingCTA } from "@/components/landing/LandingCTA";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <PageTransition>
        <main>
          <LandingHero />
          <LandingProblem />
          <LandingHowItWorks />
          <LandingPaths />
          <LandingStats />
          <LandingTestimonials />
          <LandingFAQ />
          <LandingCTA />
        </main>
      </PageTransition>
      <Footer />
    </div>
  );
};

export default Landing;
