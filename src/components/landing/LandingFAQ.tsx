import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How does the equity model work?",
    answer: "Our equity model is based on contribution, not capital. Each role in a startup has a defined equity percentage based on its criticality and the work involved. As you contribute, you earn ownership in the ventures you help build.",
  },
  {
    question: "Do I need experience to join?",
    answer: "While experience is valuable, we value skills and potential more than years of experience. Our Natural Role Decoder helps identify your unique strengths, and our learning journeys help you develop the skills needed to contribute effectively.",
  },
  {
    question: "What if I have an idea but no technical skills?",
    answer: "That's exactly what B4 is for! As an Initiator, you can propose your idea and we'll help you find skilled co-builders who can bring it to life. You contribute your vision, leadership, and domain expertise while others contribute technical skills.",
  },
  {
    question: "How are teams formed?",
    answer: "Teams are formed through our matching system. Initiators post opportunities with specific roles needed, and co-builders can apply based on their skills and interests. We also use the Natural Role Decoder to suggest optimal matches.",
  },
  {
    question: "Is B4 free to use?",
    answer: "Yes, joining B4 and participating in the platform is free. We believe in removing barriers to entrepreneurship. Revenue is generated through success — when startups we help build succeed, everyone benefits.",
  },
  {
    question: "What industries do you cover?",
    answer: "We operate across six main verticals called 'Boxes': Health, Agriculture, Education, Food, Technology, and Social Impact. Each Box is managed by industry experts who help guide startups in their domain.",
  },
];

export function LandingFAQ() {
  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <span className="inline-block text-b4-teal font-semibold text-sm uppercase tracking-wide mb-4">
            FAQ
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Common Questions
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to know about joining the B4 community.
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, i) => (
              <AccordionItem 
                key={i} 
                value={`item-${i}`}
                className="bg-background rounded-xl border border-border px-6 data-[state=open]:border-b4-teal/30"
              >
                <AccordionTrigger className="text-left font-semibold text-foreground hover:text-b4-teal py-6">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-6">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
