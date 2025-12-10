import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-20">
        {/* Hero Section */}
        <section className="py-16 md:py-20 border-b border-border bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl">
              <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
                Terms of Service
              </h1>
              <p className="text-muted-foreground">
                Last updated: December 10, 2024
              </p>
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl prose prose-neutral dark:prose-invert">
              <div className="space-y-8">
                <div>
                  <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                    1. Acceptance of Terms
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    By accessing or using B4 Platform, you agree to be bound by these Terms of 
                    Service and all applicable laws and regulations. If you do not agree with 
                    any of these terms, you are prohibited from using or accessing this platform.
                  </p>
                </div>

                <div>
                  <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                    2. Platform Description
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    B4 Platform provides a collaborative ecosystem where entrepreneurs can build 
                    startups with equity-sharing co-builders across various industry verticals 
                    (Box For entities). Our services include startup creation tools, co-builder 
                    matching, Natural Role Decoder assessments, and the "Earning by Building" program.
                  </p>
                </div>

                <div>
                  <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                    3. User Accounts
                  </h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    When you create an account with us, you must:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    <li>Provide accurate, current, and complete information</li>
                    <li>Maintain the security of your password and account</li>
                    <li>Notify us immediately of any unauthorized access</li>
                    <li>Accept responsibility for all activities under your account</li>
                  </ul>
                </div>

                <div>
                  <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                    4. Equity and Collaboration
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    B4 Platform facilitates equity-based collaborations between users. While we 
                    provide tools and frameworks for equity distribution, all equity agreements 
                    are ultimately between the participating parties. We recommend consulting 
                    with legal professionals before finalizing any equity arrangements.
                  </p>
                </div>

                <div>
                  <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                    5. User Conduct
                  </h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Users agree not to:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    <li>Use the platform for any unlawful purpose</li>
                    <li>Misrepresent your identity, skills, or qualifications</li>
                    <li>Harass, abuse, or harm other users</li>
                    <li>Upload malicious code or interfere with platform operations</li>
                    <li>Violate intellectual property rights of others</li>
                  </ul>
                </div>

                <div>
                  <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                    6. Intellectual Property
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    The B4 Platform and its original content, features, and functionality are 
                    owned by B4 Platform and are protected by international copyright, trademark, 
                    and other intellectual property laws. Your startup ideas and content remain 
                    your own, subject to any equity agreements made with co-builders.
                  </p>
                </div>

                <div>
                  <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                    7. Limitation of Liability
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    B4 Platform shall not be liable for any indirect, incidental, special, 
                    consequential, or punitive damages resulting from your use of or inability 
                    to use the platform, including but not limited to damages for loss of profits, 
                    goodwill, or other intangible losses.
                  </p>
                </div>

                <div>
                  <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                    8. Termination
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    We may terminate or suspend your account immediately, without prior notice 
                    or liability, for any reason whatsoever, including without limitation if 
                    you breach the Terms. Upon termination, your right to use the platform 
                    will immediately cease.
                  </p>
                </div>

                <div>
                  <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                    9. Changes to Terms
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    We reserve the right to modify or replace these Terms at any time. If a 
                    revision is material, we will try to provide at least 30 days' notice prior 
                    to any new terms taking effect.
                  </p>
                </div>

                <div>
                  <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                    10. Contact Us
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    If you have any questions about these Terms, please contact us at{" "}
                    <a href="mailto:legal@b4platform.com" className="text-b4-teal hover:underline">
                      legal@b4platform.com
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Terms;
