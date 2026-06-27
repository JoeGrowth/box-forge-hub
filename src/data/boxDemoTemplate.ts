// Generic demo template used when a Box exists in the database
// but is NOT in the curated static catalog (Health, Agriculture, etc.).
// Placeholder content stays in place until real platform data replaces it.

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

export function buildDemoBox(name: string, slug: string): DemoBoxDetail {
  const palette = PALETTES[hash(slug) % PALETTES.length]!;
  const topic = domainWord(name);
  return {
    id: slug,
    name,
    abbr: abbrFor(name),
    icon: BoxesIcon,
    description: `${topic} innovations nurtured inside the ecosystem.`,
    longDescription: `Box For ${topic} brings together founders, advisors and co-builders focused on solving real problems in ${topic.toLowerCase()}. Placeholder content shown below will be replaced as real startups, opportunities and rituals appear in this Box.`,
    color: palette.color,
    bgColor: palette.bgColor,
    startups: 0,
    cobuilders: 0,
    totalRaised: "$0",
    fields: [`${topic} Tech`, "Innovation", "Community", "Pilots"],
    featured: [
      { name: "Placeholder Venture A", desc: `Early-stage ${topic.toLowerCase()} concept` },
      { name: "Placeholder Venture B", desc: `Pilot-stage ${topic.toLowerCase()} solution` },
      { name: "Placeholder Venture C", desc: `Scaling ${topic.toLowerCase()} platform` },
    ],
    digitalSolutions: [
      { icon: Monitor, title: `${topic} Platforms`, description: `Web platforms tailored to the ${topic.toLowerCase()} sector.` },
      { icon: Smartphone, title: "Mobile Experiences", description: "Mobile-first apps designed for field operators and end users." },
      { icon: BarChart3, title: "Operational Analytics", description: "Dashboards and metrics to drive decisions in real time." },
      { icon: Shield, title: "Trust & Compliance", description: "Security and compliance tooling for sensitive workflows." },
      { icon: Zap, title: "Automation", description: "Workflow automation removing repetitive manual work." },
      { icon: Globe, title: "Ecosystem Integrations", description: "Connectors to the rest of the platform's graph." },
    ],
    mission: `To grow a thriving ${topic.toLowerCase()} ecosystem inside the platform.`,
  };
}
