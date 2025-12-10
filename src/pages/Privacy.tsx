import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-20">
        {/* Hero Section */}
        <section className="py-16 md:py-20 border-b border-border bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl">
              <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
                Privacy Policy
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
                    1. Introduction
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    B4 Platform ("we," "our," or "us") is committed to protecting your privacy. 
                    This Privacy Policy explains how we collect, use, disclose, and safeguard 
                    your information when you visit our website and use our platform services.
                  </p>
                </div>

                <div>
                  <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                    2. Information We Collect
                  </h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    We collect information you provide directly to us, including:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    <li>Name, email address, and contact information</li>
                    <li>Profile information (skills, experience, natural role results)</li>
                    <li>Startup and business-related information</li>
                    <li>Communications and correspondence with us</li>
                    <li>Payment and transaction information</li>
                  </ul>
                </div>

                <div>
                  <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                    3. How We Use Your Information
                  </h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    We use the information we collect to:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    <li>Provide, maintain, and improve our services</li>
                    <li>Match entrepreneurs with co-builders</li>
                    <li>Process applications and manage user accounts</li>
                    <li>Send updates, newsletters, and marketing communications</li>
                    <li>Analyze usage patterns and improve user experience</li>
                    <li>Comply with legal obligations</li>
                  </ul>
                </div>

                <div>
                  <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                    4. Information Sharing
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    We may share your information with other users on the platform (such as 
                    entrepreneurs viewing co-builder profiles), service providers who assist 
                    us in operating the platform, and as required by law. We do not sell your 
                    personal information to third parties.
                  </p>
                </div>

                <div>
                  <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                    5. Data Security
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    We implement appropriate technical and organizational measures to protect 
                    your personal information against unauthorized access, alteration, disclosure, 
                    or destruction. However, no method of transmission over the Internet is 100% secure.
                  </p>
                </div>

                <div>
                  <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                    6. Your Rights
                  </h2>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    You have the right to:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    <li>Access and receive a copy of your personal data</li>
                    <li>Rectify or update your personal information</li>
                    <li>Request deletion of your personal data</li>
                    <li>Object to or restrict processing of your data</li>
                    <li>Withdraw consent at any time</li>
                  </ul>
                </div>

                <div>
                  <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                    7. Cookies
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    We use cookies and similar tracking technologies to track activity on our 
                    platform and hold certain information. You can instruct your browser to 
                    refuse all cookies or to indicate when a cookie is being sent.
                  </p>
                </div>

                <div>
                  <h2 className="font-display text-2xl font-bold text-foreground mb-4">
                    8. Contact Us
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    If you have any questions about this Privacy Policy, please contact us at{" "}
                    <a href="mailto:privacy@b4platform.com" className="text-b4-teal hover:underline">
                      privacy@b4platform.com
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

export default Privacy;
