// Generic demo template used when a Box exists in the database
// but is NOT in the curated static catalog (Health, Agriculture, etc.).
// Produces rich beta content automatically so newly created Boxes feel
// alive from day one — placeholder labelling is intentionally avoided.

import {
  Boxes as BoxesIcon,
  Rocket,
  Monitor,
  Smartphone,
  BarChart3,
  Shield,
  Zap,
  Globe,
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

const hash = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

const abbrFor = (name: string) => {
  // "Box For Security Solutions" -> "B4SS"
  const words = name.replace(/[^a-zA-Z ]/g, "").split(/\s+/).filter(Boolean);
  return words.map((w) => w[0]!.toUpperCase()).join("").slice(0, 5);
};

const domainWord = (name: string) =>
  name.replace(/^Box\s*For\s*/i, "").replace(/\s*Solutions?$/i, "").trim() ||
  name;

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

export function buildDemoBox(name: string, slug: string): DemoBoxDetail {
  const palette = PALETTES[hash(slug) % PALETTES.length]!;
  const topic = domainWord(name);
  const topicLower = topic.toLowerCase();
  const abbr = abbrFor(name);

  // Beta stats — non-zero, deterministic, plausible for a newly opened Box.
  const startups = seeded(slug, "startups", 3, 8);
  const cobuilders = seeded(slug, "cobuilders", 12, 38);
  const raisedK = seeded(slug, "raised", 120, 780);
  const totalRaised = `$${raisedK}K`;

  // Sector-flavoured venture names so the Box feels alive from day one.
  const featured = [
    { name: `${topic.split(/\s+/)[0]}Sync`, desc: `Operating system for ${topicLower} teams` },
    { name: `${topic.split(/\s+/)[0]}Flow`, desc: `Workflow automation for ${topicLower} operators` },
    { name: `${topic.split(/\s+/)[0]}IQ`, desc: `Analytics & insights for the ${topicLower} sector` },
  ];

  return {
    id: slug,
    name,
    abbr,
    icon: BoxesIcon,
    description: `${topic} innovations nurtured inside the ecosystem.`,
    longDescription: `Box For ${topic} brings together founders, advisors and co-builders focused on solving real problems in ${topicLower}. The Box is in beta — ventures, rituals and opportunities listed here will be progressively replaced by live activity as the community grows.`,
    color: palette.color,
    bgColor: palette.bgColor,
    startups,
    cobuilders,
    totalRaised,
    fields: [`${topic} Tech`, `${topic} Innovation`, "Community & Rituals", "Pilots & Partnerships"],
    featured,
    digitalSolutions: [
      { icon: Monitor, title: `${topic} Platforms`, description: `Web platforms tailored to the ${topicLower} sector and its operators.` },
      { icon: Smartphone, title: "Mobile Experiences", description: `Mobile-first apps designed for ${topicLower} field operators and end users.` },
      { icon: BarChart3, title: "Operational Analytics", description: `Dashboards and metrics powering decisions in ${topicLower} in real time.` },
      { icon: Shield, title: "Trust & Compliance", description: `Security and compliance tooling for sensitive ${topicLower} workflows.` },
      { icon: Zap, title: "Automation", description: `Workflow automation removing repetitive ${topicLower} work.` },
      { icon: Globe, title: "Ecosystem Integrations", description: "Connectors to the rest of the platform's graph and partner networks." },
    ],
    mission: `To grow a thriving ${topicLower} ecosystem inside the platform, turning early ventures and advisors into a sustained engine of impact.`,
  };
}
