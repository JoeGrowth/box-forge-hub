// Generic demo template used when a Box exists in the database
// but is NOT in the curated static catalog (Health, Agriculture, etc.).
// Produces rich, topic-aware beta content automatically so newly
// created Boxes feel curated and alive from day one.

import {
  Boxes as BoxesIcon,
  Rocket,
  Monitor,
  Smartphone,
  BarChart3,
  Shield,
  Zap,
  Globe,
  Brain,
  Flame,
  Sparkles,
  HeartHandshake,
  Compass,
  Trophy,
  Target,
  Lightbulb,
  Users,
  Music,
  Palette,
  Sun,
  Wind,
  TreePine,
  Car,
  Plane,
  Gamepad2,
  Camera,
  BookOpen,
  Briefcase,
  type LucideIcon,
} from "lucide-react";

const PALETTES = [
  { color: "from-cyan-500 to-blue-600", bgColor: "bg-cyan-50" },
  { color: "from-fuchsia-500 to-pink-600", bgColor: "bg-fuchsia-50" },
  { color: "from-teal-500 to-emerald-600", bgColor: "bg-teal-50" },
  { color: "from-orange-500 to-red-600", bgColor: "bg-orange-50" },
  { color: "from-indigo-500 to-violet-600", bgColor: "bg-indigo-50" },
  { color: "from-lime-500 to-green-600", bgColor: "bg-lime-50" },
  { color: "from-rose-500 to-pink-600", bgColor: "bg-rose-50" },
  { color: "from-amber-500 to-orange-600", bgColor: "bg-amber-50" },
];

// Topic keyword → curated icon. First match wins; falls back to a deterministic
// pick from a generic set so every new Box gets a distinctive symbol.
const ICON_KEYWORDS: { kws: string[]; icon: LucideIcon }[] = [
  { kws: ["motiv", "mindset", "coach", "inspir"], icon: Flame },
  { kws: ["mind", "psych", "mental", "cogn", "brain"], icon: Brain },
  { kws: ["love", "relation", "care", "social"], icon: HeartHandshake },
  { kws: ["sport", "fit", "athle", "perform"], icon: Trophy },
  { kws: ["art", "design", "creat"], icon: Palette },
  { kws: ["music", "audio", "sound"], icon: Music },
  { kws: ["energy", "solar"], icon: Sun },
  { kws: ["climate", "wind", "carbon"], icon: Wind },
  { kws: ["nature", "forest", "tree", "eco"], icon: TreePine },
  { kws: ["mobility", "auto", "car", "transport"], icon: Car },
  { kws: ["travel", "tour", "aero", "avia"], icon: Plane },
  { kws: ["game", "gaming", "play"], icon: Gamepad2 },
  { kws: ["media", "video", "photo"], icon: Camera },
  { kws: ["book", "read", "publish"], icon: BookOpen },
  { kws: ["work", "career", "job", "hr"], icon: Briefcase },
  { kws: ["compass", "guide", "navig"], icon: Compass },
  { kws: ["goal", "objective", "purpose"], icon: Target },
  { kws: ["idea", "innov"], icon: Lightbulb },
  { kws: ["community", "people", "network"], icon: Users },
];

const GENERIC_ICONS: LucideIcon[] = [Sparkles, Rocket, Target, Lightbulb, BoxesIcon];

const hash = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

const abbrFor = (name: string) => {
  // "Box For Motivation Solutions" -> "B4MS"
  const words = name.replace(/[^a-zA-Z ]/g, "").split(/\s+/).filter(Boolean);
  return words.map((w) => w[0]!.toUpperCase()).join("").slice(0, 5);
};

const domainWord = (name: string) =>
  name.replace(/^Box\s*For\s*/i, "").replace(/\s*Solutions?$/i, "").trim() ||
  name;

const pickIcon = (slug: string, topic: string): LucideIcon => {
  const hay = (slug + " " + topic).toLowerCase();
  for (const { kws, icon } of ICON_KEYWORDS) {
    if (kws.some((k) => hay.includes(k))) return icon;
  }
  return GENERIC_ICONS[hash(slug) % GENERIC_ICONS.length]!;
};

export interface DemoBoxListing {
  id: string; // route param (slug)
  name: string;
  abbr: string;
  icon: LucideIcon;
  description: string;
  color: string;
  bgColor: string;
  startups: number;
  cobuilders: number;
  totalRaised: string;
  fields: string[];
  featured: { name: string; desc: string }[];
}

export interface DemoBoxDetail extends DemoBoxListing {
  longDescription: string;
  digitalSolutions: { icon: LucideIcon; title: string; description: string }[];
  mission: string;
}

// Deterministic pseudo-random number in [min,max] derived from slug + salt.
const seeded = (slug: string, salt: string, min: number, max: number) => {
  const h = hash(slug + ":" + salt);
  return min + (h % (max - min + 1));
};

const pick = <T>(arr: T[], slug: string, salt: string): T =>
  arr[hash(slug + ":" + salt) % arr.length]!;

// Curated venture name patterns — three distinct flavors so the three featured
// cards don't feel like the same template applied with different suffixes.
const VENTURE_PATTERNS: ((topic: string, slug: string) => { name: string; desc: string })[] = [
  (t, s) => ({
    name: `${t.split(/\s+/)[0]}${pick(["Loop", "Lab", "Forge", "Studio", "Works"], s, "v1-suffix")}`,
    desc: `Operating system for ${t.toLowerCase()} teams and operators.`,
  }),
  (t, s) => ({
    name: `${pick(["Bright", "Clear", "Bold", "True", "Open"], s, "v2-prefix")}${t.split(/\s+/)[0]}`,
    desc: `Consumer experience reshaping how people engage with ${t.toLowerCase()}.`,
  }),
  (t, s) => ({
    name: `${t.split(/\s+/)[0]}${pick(["IQ", "Pulse", "Signal", "Index", "Compass"], s, "v3-suffix")}`,
    desc: `Analytics and insights powering decisions across the ${t.toLowerCase()} sector.`,
  }),
];

// Curated focus-area pools per coarse topic family. Falls back to a generic set.
const TOPIC_FIELDS: { kws: string[]; fields: string[] }[] = [
  { kws: ["motiv", "mindset", "coach"], fields: ["Coaching Tech", "Habit Formation", "Workplace Wellbeing", "Community Rituals"] },
  { kws: ["mind", "mental", "psych"], fields: ["Behavioral Science", "Mental Wellness", "Therapy Tech", "Resilience Training"] },
  { kws: ["sport", "fit"], fields: ["Performance Analytics", "Recovery Tech", "Connected Equipment", "Community Sports"] },
  { kws: ["art", "design", "creat"], fields: ["Creator Tools", "Design Systems", "Cultural Platforms", "Marketplace"] },
  { kws: ["energy", "climate", "carbon"], fields: ["Clean Energy", "Carbon Tracking", "Grid Tech", "Climate Finance"] },
  { kws: ["mobility", "transport"], fields: ["Smart Mobility", "Fleet Operations", "Last-Mile", "Mobility Data"] },
  { kws: ["game", "play"], fields: ["Game Engines", "Player Economies", "Live Ops", "Creator Communities"] },
];

const pickFields = (topic: string, slug: string): string[] => {
  const hay = (slug + " " + topic).toLowerCase();
  const match = TOPIC_FIELDS.find((t) => t.kws.some((k) => hay.includes(k)));
  return match
    ? match.fields
    : [`${topic} Tech`, `${topic} Innovation`, "Community & Rituals", "Pilots & Partnerships"];
};

export function buildDemoBox(name: string, slug: string): DemoBoxDetail {
  const palette = PALETTES[hash(slug) % PALETTES.length]!;
  const topic = domainWord(name);
  const topicLower = topic.toLowerCase();
  const abbr = abbrFor(name);
  const icon = pickIcon(slug, topic);

  // Beta stats — non-zero, deterministic, plausible for a newly opened Box.
  const startups = seeded(slug, "startups", 3, 8);
  const cobuilders = seeded(slug, "cobuilders", 12, 38);
  const raisedK = seeded(slug, "raised", 120, 780);
  const totalRaised = `$${raisedK}K`;

  const featured = VENTURE_PATTERNS.map((fn) => fn(topic, slug));

  return {
    id: slug,
    name,
    abbr,
    icon,
    description: `${topic} innovations nurtured inside the ecosystem — founders, advisors and co-builders solving real problems in ${topicLower}.`,
    longDescription: `${name} brings together founders, advisors and co-builders focused on real problems in ${topicLower}. The Box is in beta — listed ventures, rituals and opportunities will be progressively replaced by live activity as the community grows around ${topicLower}.`,
    color: palette.color,
    bgColor: palette.bgColor,
    startups,
    cobuilders,
    totalRaised,
    fields: pickFields(topic, slug),
    featured,
    digitalSolutions: [
      { icon: Monitor, title: `${topic} Platforms`, description: `Web platforms tailored to the ${topicLower} sector and its operators.` },
      { icon: Smartphone, title: "Mobile Experiences", description: `Mobile-first apps designed for ${topicLower} practitioners and end users.` },
      { icon: BarChart3, title: "Operational Analytics", description: `Dashboards and metrics powering ${topicLower} decisions in real time.` },
      { icon: Shield, title: "Trust & Compliance", description: `Security and compliance tooling for sensitive ${topicLower} workflows.` },
      { icon: Zap, title: "Automation", description: `Workflow automation removing repetitive ${topicLower} work.` },
      { icon: Globe, title: "Ecosystem Integrations", description: "Connectors to the rest of the platform's graph and partner networks." },
    ],
    mission: `To grow a thriving ${topicLower} ecosystem inside the platform, turning early ventures and advisors into a sustained engine of impact.`,
  };
}
