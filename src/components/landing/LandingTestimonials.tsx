import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    quote: "I never thought I could own part of a startup without investing money. B4 changed everything — now I'm a co-owner of two growing ventures.",
    name: "Sarah K.",
    role: "UX Designer & Co-Builder",
    avatar: "S",
    startups: 2,
  },
  {
    quote: "The Natural Role Decoder helped me understand my true value. I went from freelancing to leading my own initiative in 3 months.",
    name: "Marcus T.",
    role: "Initiator",
    avatar: "M",
    startups: 1,
  },
  {
    quote: "Finding the right co-founders used to be impossible. B4's matching system connected me with exactly the skills my startup needed.",
    name: "Aisha R.",
    role: "Entrepreneur & Initiator",
    avatar: "A",
    startups: 1,
  },
];

export function LandingTestimonials() {
  return (
    <section className="py-24 bg-gradient-to-br from-b4-navy via-b4-navy/95 to-b4-navy/90 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-b4-teal/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-b4-coral/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <span className="inline-block text-b4-teal font-semibold text-sm uppercase tracking-wide mb-4">
            Success Stories
          </span>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
            From Our Community
          </h2>
          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            Real people building real startups and earning equity along the way.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {testimonials.map((testimonial, i) => (
            <div 
              key={i} 
              className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:border-b4-teal/30 transition-all duration-300"
            >
              {/* Quote icon */}
              <Quote className="w-10 h-10 text-b4-teal/30 mb-4" />
              
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="w-4 h-4 fill-b4-teal text-b4-teal" />
                ))}
              </div>
              
              {/* Quote */}
              <p className="text-white/80 mb-6 leading-relaxed">
                "{testimonial.quote}"
              </p>
              
              {/* Author */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-b4-teal to-emerald-400 flex items-center justify-center text-white font-bold">
                  {testimonial.avatar}
                </div>
                <div>
                  <div className="font-semibold text-white">{testimonial.name}</div>
                  <div className="text-sm text-white/50">{testimonial.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
