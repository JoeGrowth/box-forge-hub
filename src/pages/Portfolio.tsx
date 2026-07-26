import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Cpu, Package, Briefcase, Globe, ChevronDown, Plus } from "lucide-react";


type Unit = {
  name: string;
  subtitle?: string;
  coreEngine?: { title: string; flow: string };
  functionalProduct: string;
  businessEngine: string[];
  similar: { name: string; note: string }[];
};

type Entity = {
  name: string;
  subtitle?: string;
  children: Unit[];
};

const ECOSYSTEM: Entity[] = [
  {
    name: "B4TS",
    subtitle: "Box 4 Transformation Solutions",
    children: [
      {
        name: "COMMITT",
        coreEngine: { title: "Understanding Engine", flow: "Information \u2192 Meaning" },
        functionalProduct:
          "Creates shared understanding through learning, workshops, facilitation, and knowledge alignment",
        businessEngine: [
          "Organizational learning services",
          "Workshops",
          "Training programs",
          "Facilitation",
        ],
        similar: [
          { name: "IDEO", note: "uses workshops and collaborative methods to create shared understanding" },
          { name: "Deloitte", note: "organizational transformation and learning services" },
          { name: "McKinsey & Company", note: "problem framing, alignment, and decision support" },
        ],
      },
      {
        name: "PENGRY",
        coreEngine: { title: "Trust Engine", flow: "Security uncertainty \u2192 Trusted decisions" },
        functionalProduct:
          "Helps organizations improve security awareness, resilience, and decision-making under uncertainty",
        businessEngine: ["Security workshops", "Resilience programs", "Advisory services", "Training"],
        similar: [
          { name: "KnowBe4", note: "security awareness training" },
          { name: "SANS Institute", note: "cybersecurity education and professional training" },
          { name: "Deloitte Cyber Risk", note: "cybersecurity consulting and resilience" },
        ],
      },
    ],
  },
  {
    name: "B4HS",
    subtitle: "Box 4 Health Solutions SARL",
    children: [
      {
        name: "Smart Cigarette Case",
        functionalProduct: "Connected health device supporting behavior change",
        businessEngine: ["Hardware + digital services"],
        similar: [
          { name: "Withings", note: "connected health devices" },
          { name: "Oura Health", note: "wearable health tracking ecosystem" },
        ],
      },
      {
        name: "Saha Share",
        functionalProduct: "Health information / resource sharing solution",
        businessEngine: ["Digital health services", "Partnerships", "Possible subscriptions"],
        similar: [
          { name: "Doctolib", note: "digital healthcare access platform" },
          { name: "PatientsLikeMe", note: "patient community and health information sharing" },
        ],
      },
    ],
  },
  {
    name: "B4DS",
    subtitle: "Box 4 Digital Solutions \u00b7 future entity",
    children: [
      {
        name: "Convoy Organizer",
        functionalProduct: "Digital coordination and management solution",
        businessEngine: ["SaaS subscriptions", "Organization / event fees"],
        similar: [
          { name: "Eventbrite", note: "event organization platform" },
          { name: "Asana", note: "coordination and collaboration software" },
          { name: "Slack", note: "team coordination and communication" },
        ],
      },
    ],
  },
];

function UnitBlock({ unit }: { unit: Unit }) {
  return (
    <div className="space-y-4">
      {unit.coreEngine && (
        <div className="flex gap-3">
          <Cpu className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Core Engine
            </p>
            <p className="font-medium">{unit.coreEngine.title}</p>
            <p className="text-sm text-muted-foreground">{unit.coreEngine.flow}</p>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Package className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Functional Product
          </p>
          <p className="text-sm">{unit.functionalProduct}</p>
        </div>
      </div>

      <div className="flex gap-3">
        <Briefcase className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Business Engine
          </p>
          <ul className="text-sm space-y-0.5 mt-1">
            {unit.businessEngine.map((b) => (
              <li key={b} className="flex gap-2">
                <span className="text-muted-foreground">·</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex gap-3">
        <Globe className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
        <div className="w-full">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Similar entities
          </p>
          <div className="mt-2 space-y-2">
            {unit.similar.map((s) => (
              <div key={s.name} className="rounded-md border border-border bg-muted/40 px-3 py-2">
                <p className="text-sm font-medium">{s.name}</p>
                <p className="text-xs text-muted-foreground">→ {s.note}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function UnitCollapsible({ unit }: { unit: Unit }) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-lg border border-border bg-card/60">
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left">
          <div>
            <h3 className="font-semibold">{unit.name}</h3>
            {unit.coreEngine && (
              <p className="text-xs text-muted-foreground">{unit.coreEngine.title}</p>
            )}
          </div>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-5 pb-5 pt-1">
            <UnitBlock unit={unit} />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function EntityCollapsible({ entity }: { entity: Entity }) {
  const [open, setOpen] = useState(true);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="border-border/80">
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 p-6 text-left">
          <div>
            <h2 className="text-xl font-bold tracking-tight">{entity.name}</h2>
            {entity.subtitle && (
              <p className="text-sm text-muted-foreground">{entity.subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary">{entity.children.length}</Badge>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
            />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="px-6 pb-6 pt-0 space-y-4">
            {entity.children.map((child) => (
              <UnitCollapsible key={child.name} unit={child} />
            ))}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default function Portfolio() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-16 max-w-5xl">
        <header className="mb-10">
          <Badge variant="secondary" className="mb-3">Portfolio</Badge>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Box 4 Group / Solutions Ecosystem
          </h1>
          <p className="text-muted-foreground mt-3 max-w-2xl">
            Every entity in the group mapped by its core engine, functional product, business
            engine, and comparable players in the market.
          </p>
        </header>

        <div className="relative space-y-8 md:pl-8 md:before:absolute md:before:left-2 md:before:top-4 md:before:bottom-4 md:before:w-px md:before:bg-border">
          {ECOSYSTEM.map((entity) => (
            <section key={entity.name} className="relative">
              <div className="hidden md:block absolute -left-[26px] top-7 h-px w-6 bg-border" />
              <EntityCollapsible entity={entity} />
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
