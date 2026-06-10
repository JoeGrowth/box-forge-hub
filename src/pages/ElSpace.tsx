import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Globe, Mail, Phone, MapPin, Linkedin, Facebook, Instagram, Twitter,
  ArrowRight, Calendar, Download, ExternalLink, Users, Rocket, Sprout,
  HeartHandshake, Lightbulb, GraduationCap, Send, FileText, Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const BRAND = {
  teal: "#0F766E",
  cyan: "#14B8A6",
  amber: "#F59E0B",
};

const impactAreas = [
  { icon: Lightbulb, label: "Social Innovation" },
  { icon: Rocket, label: "Entrepreneurship" },
  { icon: GraduationCap, label: "Youth Empowerment" },
  { icon: Sprout, label: "Sustainability" },
  { icon: HeartHandshake, label: "Community Development" },
];

const stats = [
  { value: 12500, suffix: "+", label: "Beneficiaries" },
  { value: 85, suffix: "", label: "Programs Delivered" },
  { value: 240, suffix: "+", label: "Startups Supported" },
  { value: 5400, suffix: "", label: "Community Members" },
  { value: 45, suffix: "", label: "Partners" },
  { value: 9, suffix: "", label: "Years of Impact" },
];

const projects = [
  { title: "She Innovates", desc: "Empowering women entrepreneurs through mentorship, capital access and skills.", location: "Tunis, Tunisia", duration: "2024 – 2026", status: "Active", img: "https://images.unsplash.com/photo-1573164574572-cb89e39749b4?w=800&q=80" },
  { title: "Green Future Lab", desc: "Incubating climate-tech startups across North Africa with hands-on coaching.", location: "Sfax, Tunisia", duration: "2023 – 2025", status: "Active", img: "https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=800&q=80" },
  { title: "Youth Code", desc: "Free coding bootcamps for underrepresented youth across the country.", location: "Nationwide", duration: "2022 – 2024", status: "Completed", img: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&q=80" },
  { title: "Med Connect", desc: "Cross-Mediterranean exchange program for civic innovators.", location: "MENA + EU", duration: "2024 – 2027", status: "Active", img: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&q=80" },
  { title: "Impact Forge", desc: "Accelerator for social enterprises tackling community challenges.", location: "Sousse, Tunisia", duration: "2023", status: "Completed", img: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&q=80" },
  { title: "Civic Tech Hub", desc: "Building open-source tools for democratic participation.", location: "Tunis, Tunisia", duration: "2025 – 2026", status: "Active", img: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&q=80" },
];

const events = [
  { date: "2026-07-15", title: "EL Space Innovation Summit 2026", location: "Tunis", category: "Conference", upcoming: true },
  { date: "2026-08-04", title: "Startup Pitch Night #14", location: "EL Space HQ", category: "Pitch", upcoming: true },
  { date: "2026-09-22", title: "Climate Action Hackathon", location: "Sfax", category: "Hackathon", upcoming: true },
  { date: "2026-04-10", title: "Women in Tech MENA", location: "Tunis", category: "Forum", upcoming: false },
  { date: "2026-02-18", title: "Social Impact Awards 2026", location: "Tunis", category: "Awards", upcoming: false },
];

const opportunities = [
  { type: "Job", title: "Program Manager – Entrepreneurship", deadline: "2026-07-01", desc: "Lead our flagship incubator and coordinate cohort delivery." },
  { type: "Internship", title: "Communications Intern", deadline: "2026-06-25", desc: "Support storytelling, social media and community engagement." },
  { type: "Call for Applications", title: "She Innovates Cohort 4", deadline: "2026-08-15", desc: "12-week accelerator for women-led ventures across Tunisia." },
  { type: "Grant", title: "Climate Seed Grant", deadline: "2026-09-30", desc: "Up to $15K for early-stage climate-tech projects." },
  { type: "Training", title: "Impact Measurement Bootcamp", deadline: "2026-07-20", desc: "Free 5-day intensive on theory of change and KPIs." },
];

const resources = [
  { type: "Report", title: "State of Social Innovation in Tunisia 2026", icon: FileText },
  { type: "Toolkit", title: "Founder's Playbook: From Idea to MVP", icon: Lightbulb },
  { type: "Research", title: "Youth Civic Engagement Study", icon: GraduationCap },
  { type: "Success Story", title: "How GreenLeaf Scaled Across MENA", icon: Award },
];

const partners = [
  "UNDP", "British Council", "GIZ", "USAID", "EU Delegation",
  "Drosos Foundation", "Tunisian Startups", "Smart Capital", "Anava", "Flat6Labs",
];

const team = [
  { name: "Leïla Ben Salah", role: "Founder & CEO", bio: "Social entrepreneur with 15 years building inclusive ecosystems.", img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80" },
  { name: "Karim Trabelsi", role: "Programs Director", bio: "Designs and runs EL Space's flagship acceleration tracks.", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80" },
  { name: "Sami Gharbi", role: "Innovation Lead", bio: "Connects founders to capital, talent and community.", img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80" },
  { name: "Nour El Houda", role: "Community Manager", bio: "Curates our 5,000+ member innovator community.", img: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80" },
];

const testimonials = [
  { quote: "EL Space gave us the runway, the network and the courage to launch. We tripled revenue within a year of joining their accelerator.", author: "Yasmine K.", role: "Founder, EcoPack Tunisia" },
  { quote: "Few hubs in the region match EL Space's depth of program design and community care. A true ecosystem builder.", author: "Ahmed B.", role: "Partner, MENA Impact Fund" },
  { quote: "I joined as a student looking for direction. Today I'm leading a civic-tech startup. EL Space is family.", author: "Mariem T.", role: "Alumna, Youth Code 2023" },
];

function useCountUp(target: number, durationMs = 1500, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs, start]);
  return value;
}

function StatCard({ value, suffix, label, visible }: { value: number; suffix: string; label: string; visible: boolean }) {
  const v = useCountUp(value, 1600, visible);
  return (
    <div className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-1 hover:shadow-lg">
      <div className="text-3xl md:text-4xl font-bold" style={{ color: BRAND.teal }}>
        {v.toLocaleString()}{suffix}
      </div>
      <div className="mt-2 text-sm font-medium text-slate-600">{label}</div>
    </div>
  );
}

export default function ElSpace() {
  const statsRef = useRef<HTMLDivElement>(null);
  const [statsVisible, setStatsVisible] = useState(false);
  const [contact, setContact] = useState({ name: "", email: "", message: "" });
  const [eventFilter, setEventFilter] = useState<"upcoming" | "past">("upcoming");

  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setStatsVisible(true), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact.name || !contact.email || !contact.message) {
      toast.error("Please fill all fields.");
      return;
    }
    toast.success("Message sent. EL Space will get back to you shortly.");
    setContact({ name: "", email: "", message: "" });
  };

  const handleNewsletter = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    if (!email) return;
    toast.success("Subscribed to the EL Space newsletter.");
    form.reset();
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Helmet>
        <title>EL Space — Tunisia's First Social Innovation Hub</title>
        <meta name="description" content="EL Space is Tunisia's first social innovation hub — supporting entrepreneurs, youth and community builders through programs, events and grants." />
        <link rel="canonical" href="/el-space" />
        <meta property="og:title" content="EL Space — Social Innovation Hub" />
        <meta property="og:description" content="Programs, events, opportunities and resources from Tunisia's leading social innovation hub." />
        <meta property="og:type" content="website" />
      </Helmet>

      {/* 1. HERO */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(15,118,110,0.92) 0%, rgba(20,184,166,0.85) 60%, rgba(245,158,11,0.75) 100%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-25 mix-blend-overlay bg-cover bg-center"
          style={{ backgroundImage: "url(https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1600&q=80)" }}
        />
        <div className="relative mx-auto max-w-7xl px-6 pt-24 pb-32 text-white">
          <div className="flex flex-col items-start gap-8 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl animate-fade-in">
              <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-white/95 shadow-xl ring-1 ring-white/30">
                <span className="text-3xl font-extrabold tracking-tight" style={{ color: BRAND.teal }}>EL</span>
              </div>
              <Badge className="mb-4 border-white/30 bg-white/15 text-white backdrop-blur">Non-Profit · Tunisia</Badge>
              <h1 className="font-display text-4xl font-extrabold leading-tight md:text-6xl">EL Space</h1>
              <p className="mt-3 text-lg md:text-2xl text-white/90">Tunisia's First Social Innovation Hub</p>
              <p className="mt-5 max-w-xl text-white/80">
                A community of changemakers building inclusive, sustainable and youth-led solutions across the MENA region.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button size="lg" className="bg-white text-[color:var(--brand)] hover:bg-white/90" style={{ ["--brand" as any]: BRAND.teal }}>
                  <Globe className="w-4 h-4" /> Visit Website
                </Button>
                <Button size="lg" variant="hero-outline" asChild>
                  <a href="#contact"><Mail className="w-4 h-4" /> Contact Us</a>
                </Button>
                <Button size="lg" className="text-white hover:opacity-90" style={{ backgroundColor: BRAND.amber }} asChild>
                  <a href="#opportunities"><Rocket className="w-4 h-4" /> Apply to Programs</a>
                </Button>
              </div>
            </div>
            <div className="flex flex-col items-start gap-3 md:items-end">
              <div className="flex gap-2">
                {[Linkedin, Facebook, Instagram, Twitter].map((Icon, i) => (
                  <a key={i} href="#" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 backdrop-blur transition hover:bg-white/30">
                    <Icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
              <a href="#" className="text-sm text-white/85 hover:text-white inline-flex items-center gap-1">
                elspace.tn <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
        <svg className="absolute bottom-0 left-0 right-0" viewBox="0 0 1440 60" preserveAspectRatio="none" style={{ height: 60 }}>
          <path d="M0,30 C360,80 1080,0 1440,40 L1440,60 L0,60 Z" fill="white" />
        </svg>
      </section>

      {/* 2. OVERVIEW */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-10 md:grid-cols-3">
          <div className="md:col-span-2">
            <h2 className="font-display text-3xl font-bold md:text-4xl">About EL Space</h2>
            <p className="mt-4 text-slate-600 leading-relaxed">
              Founded in 2017, EL Space is Tunisia's first hub dedicated to social innovation. We bring
              together entrepreneurs, civil society, public institutions and international partners to
              co-design solutions for the country's most pressing challenges — from youth unemployment to
              climate resilience and democratic participation.
            </p>
            <div className="mt-8 grid gap-6 sm:grid-cols-3">
              {[
                { t: "Mission", d: "Equip changemakers with the skills, networks and capital to launch lasting social impact." },
                { t: "Vision", d: "An inclusive, innovative Tunisia where everyone has the power to shape their future." },
                { t: "Values", d: "Inclusion, integrity, collaboration, sustainability and creative courage." },
              ].map((c) => (
                <div key={c.t} className="rounded-xl border border-slate-100 bg-slate-50/60 p-5">
                  <div className="text-sm font-bold uppercase tracking-wide" style={{ color: BRAND.teal }}>{c.t}</div>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">{c.d}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-display text-xl font-bold">Areas of Impact</h3>
            <div className="mt-4 space-y-3">
              {impactAreas.map(({ icon: Icon, label }) => (
                <div key={label} className="group flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-4 transition hover:border-transparent hover:shadow-md" style={{ ["--accent" as any]: BRAND.cyan }}>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg transition group-hover:scale-110" style={{ backgroundColor: `${BRAND.teal}15`, color: BRAND.teal }}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="font-medium text-slate-800">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. IMPACT STATS */}
      <section ref={statsRef} className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-12 text-center">
            <h2 className="font-display text-3xl font-bold md:text-4xl">Our Impact in Numbers</h2>
            <p className="mt-3 text-slate-600">Nine years of community-led transformation.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            {stats.map((s) => (
              <StatCard key={s.label} {...s} visible={statsVisible} />
            ))}
          </div>
        </div>
      </section>

      {/* 4. PROGRAMS & PROJECTS */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-10 flex items-end justify-between flex-wrap gap-4">
          <div>
            <h2 className="font-display text-3xl font-bold md:text-4xl">Programs & Projects</h2>
            <p className="mt-2 text-slate-600">Initiatives we run, support and co-design.</p>
          </div>
          <Button variant="outline">View all <ArrowRight className="w-4 h-4" /></Button>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Card key={p.title} className="overflow-hidden border-slate-100 transition hover:-translate-y-1 hover:shadow-xl">
              <div className="relative h-48 overflow-hidden">
                <img src={p.img} alt={p.title} className="h-full w-full object-cover transition duration-500 hover:scale-105" loading="lazy" />
                <Badge
                  className="absolute top-3 right-3 border-0 text-white"
                  style={{ backgroundColor: p.status === "Active" ? BRAND.teal : "#64748b" }}
                >
                  {p.status}
                </Badge>
              </div>
              <CardContent className="p-5">
                <h3 className="font-display text-lg font-bold">{p.title}</h3>
                <p className="mt-2 text-sm text-slate-600 line-clamp-2">{p.desc}</p>
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{p.location}</span>
                  <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" />{p.duration}</span>
                </div>
                <Button variant="link" className="mt-3 h-auto p-0" style={{ color: BRAND.teal }}>
                  Read more <ArrowRight className="w-3 h-3" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* 5. EVENTS TIMELINE */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-8 text-center">
            <h2 className="font-display text-3xl font-bold md:text-4xl">Events</h2>
            <p className="mt-2 text-slate-600">Where the community gathers.</p>
          </div>
          <div className="mb-8 flex justify-center gap-2">
            {(["upcoming", "past"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setEventFilter(k)}
                className={`rounded-full px-5 py-2 text-sm font-medium transition ${
                  eventFilter === k ? "text-white shadow" : "bg-white text-slate-600 hover:bg-slate-100"
                }`}
                style={eventFilter === k ? { backgroundColor: BRAND.teal } : {}}
              >
                {k === "upcoming" ? "Upcoming" : "Past"}
              </button>
            ))}
          </div>
          <div className="relative">
            <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px bg-slate-200 md:-translate-x-1/2" />
            <div className="space-y-6">
              {events
                .filter((e) => (eventFilter === "upcoming" ? e.upcoming : !e.upcoming))
                .map((e, i) => (
                  <div key={e.title} className={`relative pl-12 md:pl-0 md:grid md:grid-cols-2 md:gap-8 ${i % 2 ? "md:[&>*:first-child]:order-2" : ""}`}>
                    <div className="absolute left-4 md:left-1/2 top-5 h-3 w-3 -translate-x-1/2 rounded-full ring-4 ring-white" style={{ backgroundColor: BRAND.amber }} />
                    <div className={`md:text-right ${i % 2 ? "md:text-left" : ""}`}>
                      <Card className="border-slate-100">
                        <CardContent className="p-5">
                          <Badge variant="secondary" className="mb-2">{e.category}</Badge>
                          <h3 className="font-bold">{e.title}</h3>
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 md:justify-end">
                            <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(e.date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</span>
                            <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{e.location}</span>
                          </div>
                          {e.upcoming && (
                            <Button size="sm" className="mt-4 text-white" style={{ backgroundColor: BRAND.teal }}>Register</Button>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                    <div className="hidden md:block" />
                  </div>
                ))}
            </div>
          </div>
        </div>
      </section>

      {/* 6. OPPORTUNITIES */}
      <section id="opportunities" className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-10 text-center">
          <h2 className="font-display text-3xl font-bold md:text-4xl">Opportunities</h2>
          <p className="mt-2 text-slate-600">Open calls, jobs, grants and training.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {opportunities.map((o) => (
            <Card key={o.title} className="border-slate-100 transition hover:-translate-y-1 hover:shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-3">
                  <Badge style={{ backgroundColor: `${BRAND.cyan}20`, color: BRAND.teal }} className="border-0">{o.type}</Badge>
                  <span className="text-xs text-slate-500">Deadline · {new Date(o.deadline).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</span>
                </div>
                <h3 className="mt-3 font-bold leading-snug">{o.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{o.desc}</p>
                <Button size="sm" className="mt-5 w-full text-white" style={{ backgroundColor: BRAND.teal }}>
                  Apply now <ArrowRight className="w-3 h-3" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* 7. RESOURCES */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-10 flex items-end justify-between flex-wrap gap-4">
            <div>
              <h2 className="font-display text-3xl font-bold md:text-4xl">Resources & Publications</h2>
              <p className="mt-2 text-slate-600">Open knowledge from our work and our community.</p>
            </div>
            <Button variant="outline">Browse library</Button>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {resources.map((r) => (
              <Card key={r.title} className="border-slate-100 transition hover:-translate-y-1 hover:shadow-md">
                <CardContent className="p-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ backgroundColor: `${BRAND.amber}20`, color: BRAND.amber }}>
                    <r.icon className="w-5 h-5" />
                  </div>
                  <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">{r.type}</div>
                  <h3 className="mt-1 font-bold leading-snug">{r.title}</h3>
                  <Button variant="link" className="mt-3 h-auto p-0" style={{ color: BRAND.teal }}>
                    <Download className="w-3 h-3" /> Download
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 8. PARTNERS */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-10 text-center">
          <h2 className="font-display text-3xl font-bold md:text-4xl">Our Partners</h2>
          <p className="mt-2 text-slate-600">Funders, ecosystem allies and collaborators.</p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          {partners.map((p) => (
            <div key={p} className="flex h-20 items-center justify-center rounded-xl border border-slate-100 bg-white px-4 text-sm font-semibold text-slate-500 transition hover:border-transparent hover:shadow-md hover:text-slate-900">
              {p}
            </div>
          ))}
        </div>
      </section>

      {/* 9. TEAM */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-10 text-center">
            <h2 className="font-display text-3xl font-bold md:text-4xl">The Team</h2>
            <p className="mt-2 text-slate-600">People behind EL Space.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {team.map((m) => (
              <Card key={m.name} className="overflow-hidden border-slate-100 transition hover:-translate-y-1 hover:shadow-lg">
                <div className="aspect-square overflow-hidden bg-slate-100">
                  <img src={m.img} alt={m.name} className="h-full w-full object-cover transition duration-500 hover:scale-105" loading="lazy" />
                </div>
                <CardContent className="p-5">
                  <h3 className="font-bold">{m.name}</h3>
                  <div className="text-sm font-medium" style={{ color: BRAND.teal }}>{m.role}</div>
                  <p className="mt-2 text-sm text-slate-600 line-clamp-2">{m.bio}</p>
                  <a href="#" className="mt-3 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800">
                    <Linkedin className="w-3 h-3" /> LinkedIn
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 10. TESTIMONIALS */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-10 text-center">
          <h2 className="font-display text-3xl font-bold md:text-4xl">Stories from the Community</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <Card key={t.author} className="border-slate-100 bg-gradient-to-br from-white to-slate-50">
              <CardContent className="p-6">
                <div className="text-5xl leading-none font-serif" style={{ color: BRAND.amber }}>"</div>
                <p className="mt-2 text-slate-700 leading-relaxed">{t.quote}</p>
                <div className="mt-5 border-t border-slate-100 pt-4">
                  <div className="font-bold">{t.author}</div>
                  <div className="text-xs text-slate-500">{t.role}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* 11. CONTACT */}
      <section id="contact" className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-10 text-center">
            <h2 className="font-display text-3xl font-bold md:text-4xl">Get in Touch</h2>
            <p className="mt-2 text-slate-600">We'd love to hear from you.</p>
          </div>
          <div className="grid gap-8 md:grid-cols-2">
            <div className="space-y-4">
              <Card className="border-slate-100">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 mt-0.5" style={{ color: BRAND.teal }} />
                    <div>
                      <div className="font-semibold">Address</div>
                      <div className="text-sm text-slate-600">12 Rue de l'Innovation, Lac 2, Tunis 1053, Tunisia</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 mt-0.5" style={{ color: BRAND.teal }} />
                    <div>
                      <div className="font-semibold">Phone</div>
                      <div className="text-sm text-slate-600">+216 71 000 000</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 mt-0.5" style={{ color: BRAND.teal }} />
                    <div>
                      <div className="font-semibold">Email</div>
                      <div className="text-sm text-slate-600">hello@elspace.tn</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <div className="aspect-video overflow-hidden rounded-xl border border-slate-100">
                <iframe
                  title="EL Space location"
                  src="https://www.openstreetmap.org/export/embed.html?bbox=10.18%2C36.83%2C10.30%2C36.88&layer=mapnik"
                  className="h-full w-full"
                  loading="lazy"
                />
              </div>
            </div>
            <Card className="border-slate-100">
              <CardContent className="p-6">
                <form className="space-y-4" onSubmit={handleContactSubmit}>
                  <div>
                    <label className="text-sm font-medium">Name</label>
                    <Input value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} placeholder="Your full name" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <Input type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} placeholder="you@example.com" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Message</label>
                    <Textarea rows={5} value={contact.message} onChange={(e) => setContact({ ...contact, message: e.target.value })} placeholder="How can we help?" />
                  </div>
                  <Button type="submit" className="w-full text-white" style={{ backgroundColor: BRAND.teal }}>
                    <Send className="w-4 h-4" /> Send Message
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 12. FOOTER */}
      <footer className="text-white" style={{ backgroundColor: "#0b3b37" }}>
        <div className="mx-auto max-w-7xl px-6 py-14">
          <div className="grid gap-10 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white">
                  <span className="font-extrabold" style={{ color: BRAND.teal }}>EL</span>
                </div>
                <span className="font-display text-xl font-bold">EL Space</span>
              </div>
              <p className="mt-3 text-sm text-white/70">Tunisia's first social innovation hub.</p>
              <div className="mt-4 flex gap-2">
                {[Linkedin, Facebook, Instagram, Twitter].map((Icon, i) => (
                  <a key={i} href="#" className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20">
                    <Icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>
            <div>
              <div className="font-semibold mb-3">Explore</div>
              <ul className="space-y-2 text-sm text-white/70">
                <li><a href="#" className="hover:text-white">About</a></li>
                <li><a href="#" className="hover:text-white">Programs</a></li>
                <li><a href="#opportunities" className="hover:text-white">Opportunities</a></li>
                <li><a href="#" className="hover:text-white">Resources</a></li>
              </ul>
            </div>
            <div>
              <div className="font-semibold mb-3">Community</div>
              <ul className="space-y-2 text-sm text-white/70">
                <li><a href="#" className="hover:text-white">Events</a></li>
                <li><a href="#" className="hover:text-white">Team</a></li>
                <li><a href="#" className="hover:text-white">Partners</a></li>
                <li><a href="#contact" className="hover:text-white">Contact</a></li>
              </ul>
            </div>
            <div>
              <div className="font-semibold mb-3">Newsletter</div>
              <p className="text-sm text-white/70">Monthly updates from the EL Space ecosystem.</p>
              <form className="mt-3 flex gap-2" onSubmit={handleNewsletter}>
                <Input name="email" type="email" placeholder="Your email" className="bg-white/10 border-white/20 text-white placeholder:text-white/50" />
                <Button type="submit" className="text-white" style={{ backgroundColor: BRAND.amber }}>
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </div>
          <div className="mt-10 border-t border-white/10 pt-6 flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-white/60">
            <div>© {new Date().getFullYear()} EL Space. All rights reserved.</div>
            <div className="flex gap-4">
              <a href="#" className="hover:text-white">Privacy</a>
              <a href="#" className="hover:text-white">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
