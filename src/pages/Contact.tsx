import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, MapPin, Phone, Send, MessageSquare, Building, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const contactMethods = [
  {
    icon: Mail,
    title: "Email Us",
    description: "Our team typically responds within 24 hours",
    contact: "hello@b4platform.com",
    href: "mailto:hello@b4platform.com",
  },
  {
    icon: MapPin,
    title: "Visit Us",
    description: "Come say hello at our headquarters",
    contact: "123 Innovation Hub, Tech City",
    href: "#",
  },
  {
    icon: Phone,
    title: "Call Us",
    description: "Mon-Fri from 9am to 6pm",
    contact: "+1 (555) 123-4567",
    href: "tel:+15551234567",
  },
];

const inquiryTypes = [
  { icon: Users, label: "Join as Co-Builder", value: "cobuilder" },
  { icon: Building, label: "Start a Startup", value: "entrepreneur" },
  { icon: MessageSquare, label: "General Inquiry", value: "general" },
];

const Contact = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedType, setSelectedType] = useState("general");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Placeholder for form submission
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Message sent!",
        description: "We'll get back to you as soon as possible.",
      });
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-20">
        {/* Hero Section */}
        <section className="py-20 md:py-28 relative overflow-hidden">
          <div className="absolute inset-0 gradient-hero opacity-50" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <span className="inline-block px-4 py-2 rounded-full bg-b4-teal/10 text-b4-teal text-sm font-medium mb-6">
                Contact Us
              </span>
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
                Let's Build{" "}
                <span className="text-gradient">Something Amazing</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                Have questions about B4 Platform? Want to join our community? 
                We'd love to hear from you.
              </p>
            </div>
          </div>
        </section>

        {/* Contact Methods */}
        <section className="py-12 border-y border-border bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-6">
              {contactMethods.map((method, index) => (
                <a
                  key={index}
                  href={method.href}
                  className="group bg-card rounded-xl border border-border p-6 hover:shadow-lg hover:border-b4-teal/30 transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-xl bg-b4-teal/10 flex items-center justify-center mb-4 group-hover:bg-b4-teal/20 transition-colors">
                    <method.icon className="w-6 h-6 text-b4-teal" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-foreground mb-1">
                    {method.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-2">{method.description}</p>
                  <p className="text-b4-teal font-medium">{method.contact}</p>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Contact Form */}
        <section className="py-20 md:py-28">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
                  Send Us a Message
                </h2>
                <p className="text-muted-foreground">
                  Fill out the form below and we'll get back to you shortly.
                </p>
              </div>

              <div className="bg-card rounded-2xl border border-border p-8 md:p-10 shadow-lg">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Inquiry Type */}
                  <div className="space-y-3">
                    <Label>What can we help you with?</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {inquiryTypes.map((type) => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setSelectedType(type.value)}
                          className={`p-4 rounded-xl border text-center transition-all ${
                            selectedType === type.value
                              ? "border-b4-teal bg-b4-teal/10 text-foreground"
                              : "border-border hover:border-b4-teal/30 text-muted-foreground"
                          }`}
                        >
                          <type.icon className="w-5 h-5 mx-auto mb-2" />
                          <span className="text-xs font-medium">{type.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Name & Email */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        placeholder="John Doe"
                        required
                        className="h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        required
                        className="h-12"
                      />
                    </div>
                  </div>

                  {/* Subject */}
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      placeholder="How can we help?"
                      required
                      className="h-12"
                    />
                  </div>

                  {/* Message */}
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      placeholder="Tell us more about your inquiry..."
                      required
                      className="min-h-[150px] resize-none"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    variant="teal" 
                    size="lg" 
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? "Sending..." : "Send Message"}
                    <Send className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Contact;
