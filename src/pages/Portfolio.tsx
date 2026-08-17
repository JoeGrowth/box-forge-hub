import { useCallback, useEffect, useState } from "react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Cpu,
  Package,
  Briefcase,
  Globe,
  ChevronDown,
  Plus,
  Pencil,
  Trash2,
  Sparkles,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type Similar = { name: string; note: string };

type Product = {
  id: string;
  entity_id: string;
  name: string;
  core_engine_title: string;
  core_engine_flow: string;
  functional_product: string;
  business_engine: string[];
  similar_entities: Similar[];
  position: number;
};

type Entity = {
  id: string;
  name: string;
  subtitle: string;
  position: number;
  children: Product[];
};

type SeedUnit = {
  name: string;
  coreEngine?: { title: string; flow: string };
  functionalProduct: string;
  businessEngine: string[];
  similar: Similar[];
};

const DEFAULT_ECOSYSTEM: { name: string; subtitle: string; children: SeedUnit[] }[] = [
  {
    name: "B4TS",
    subtitle: "Box 4 Transformation Solutions",
    children: [
      {
        name: "COMMITT",
        coreEngine: { title: "Understanding Engine", flow: "Information \u2192 Meaning" },
        functionalProduct:
          "Creates shared understanding through learning, workshops, facilitation, and knowledge alignment",
        businessEngine: ["Organizational learning services", "Workshops", "Training programs", "Facilitation"],
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

const localFallback = (): Entity[] =>
  DEFAULT_ECOSYSTEM.map((e, i) => ({
    id: `local-${i}`,
    name: e.name,
    subtitle: e.subtitle,
    position: i,
    children: e.children.map((c, j) => ({
      id: `local-${i}-${j}`,
      entity_id: `local-${i}`,
      name: c.name,
      core_engine_title: c.coreEngine?.title || "",
      core_engine_flow: c.coreEngine?.flow || "",
      functional_product: c.functionalProduct,
      business_engine: c.businessEngine,
      similar_entities: c.similar,
      position: j,
    })),
  }));

const linesToList = (s: string) =>
  s.split("\n").map((l) => l.trim()).filter(Boolean);

const linesToSimilar = (s: string): Similar[] =>
  linesToList(s).map((l) => {
    const sep = l.includes("—") ? "—" : l.includes("-") ? "-" : null;
    if (!sep) return { name: l, note: "" };
    const [name, ...rest] = l.split(sep);
    return { name: name.trim(), note: rest.join(sep).trim() };
  });

const similarToLines = (list: Similar[]) =>
  list.map((s) => (s.note ? `${s.name} — ${s.note}` : s.name)).join("\n");

/* ---------------- Section blocks ---------------- */

function SectionHeader({
  icon,
  title,
  canEdit,
  onEdit,
  onClear,
}: {
  icon: React.ReactNode;
  title: string;
  canEdit: boolean;
  onEdit: () => void;
  onClear: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      {canEdit && (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={onClear}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
      <span className="sr-only">{icon}</span>
    </div>
  );
}

function ProductBody({
  product,
  canEdit,
  onEditSection,
  onClearSection,
}: {
  product: Product;
  canEdit: boolean;
  onEditSection: (section: SectionKey) => void;
  onClearSection: (section: SectionKey) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex gap-3">
        <Cpu className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
        <div className="w-full">
          <SectionHeader
            icon={null}
            title="Core Engine"
            canEdit={canEdit}
            onEdit={() => onEditSection("core")}
            onClear={() => onClearSection("core")}
          />
          {product.core_engine_title ? (
            <>
              <p className="font-medium">{product.core_engine_title}</p>
              <p className="text-sm text-muted-foreground">{product.core_engine_flow}</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground italic">Not defined.</p>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <Package className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
        <div className="w-full">
          <SectionHeader
            icon={null}
            title="Functional Product"
            canEdit={canEdit}
            onEdit={() => onEditSection("functional")}
            onClear={() => onClearSection("functional")}
          />
          <p className="text-sm">
            {product.functional_product || <span className="text-muted-foreground italic">Not defined.</span>}
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <Briefcase className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
        <div className="w-full">
          <SectionHeader
            icon={null}
            title="Business Engine"
            canEdit={canEdit}
            onEdit={() => onEditSection("business")}
            onClear={() => onClearSection("business")}
          />
          {product.business_engine.length ? (
            <ul className="text-sm space-y-0.5 mt-1">
              {product.business_engine.map((b) => (
                <li key={b} className="flex gap-2">
                  <span className="text-muted-foreground">·</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground italic">Not defined.</p>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <Globe className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
        <div className="w-full">
          <SectionHeader
            icon={null}
            title="Similar entities"
            canEdit={canEdit}
            onEdit={() => onEditSection("similar")}
            onClear={() => onClearSection("similar")}
          />
          {product.similar_entities.length ? (
            <div className="mt-2 space-y-2">
              {product.similar_entities.map((s) => (
                <div key={s.name} className="rounded-md border border-border bg-muted/40 px-3 py-2">
                  <p className="text-sm font-medium">{s.name}</p>
                  {s.note && <p className="text-xs text-muted-foreground">→ {s.note}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">Not defined.</p>
          )}
        </div>
      </div>
    </div>
  );
}

type SectionKey = "core" | "functional" | "business" | "similar";

/* ---------------- Page ---------------- */

const emptyProductForm = {
  name: "",
  coreEngineTitle: "",
  coreEngineFlow: "",
  functionalProduct: "",
  businessEngine: "",
  similar: "",
};

export default function Portfolio() {
  const { user } = useAuth();
  const [ecosystem, setEcosystem] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [openEntities, setOpenEntities] = useState<Record<string, boolean>>({});
  const [openProducts, setOpenProducts] = useState<Record<string, boolean>>({});

  const [entityDialog, setEntityDialog] = useState<{ mode: "add" | "edit"; entity?: Entity } | null>(null);
  const [entityWord, setEntityWord] = useState("");
  const [entityCode, setEntityCode] = useState("");

  const [productDialog, setProductDialog] = useState<{ entity: Entity; product?: Product } | null>(null);
  const [productForm, setProductForm] = useState(emptyProductForm);
  const [generating, setGenerating] = useState(false);

  const [sectionDialog, setSectionDialog] = useState<{ product: Product; section: SectionKey } | null>(null);
  const [sectionValueA, setSectionValueA] = useState("");
  const [sectionValueB, setSectionValueB] = useState("");

  const [confirmDelete, setConfirmDelete] = useState<
    | { kind: "entity"; entity: Entity }
    | { kind: "product"; product: Product }
    | { kind: "section"; product: Product; section: SectionKey }
    | null
  >(null);

  const canEdit = !!user;

  const load = useCallback(async () => {
    setLoading(true);
    const { data: entities, error } = await supabase
      .from("portfolio_entities")
      .select("*")
      .order("position", { ascending: true });

    if (error || !entities) {
      setEcosystem(localFallback());
      setLoading(false);
      return;
    }

    if (entities.length === 0) {
      if (!user) {
        setEcosystem(localFallback());
        setLoading(false);
        return;
      }
      await seedDefaults(user.id);
      return;
    }

    const { data: products } = await supabase
      .from("portfolio_products")
      .select("*")
      .order("position", { ascending: true });

    const mapped: Entity[] = entities.map((e: any) => ({
      id: e.id,
      name: e.name,
      subtitle: e.subtitle || "",
      position: e.position,
      children: (products || [])
        .filter((p: any) => p.entity_id === e.id)
        .map((p: any) => ({
          id: p.id,
          entity_id: p.entity_id,
          name: p.name,
          core_engine_title: p.core_engine_title || "",
          core_engine_flow: p.core_engine_flow || "",
          functional_product: p.functional_product || "",
          business_engine: p.business_engine || [],
          similar_entities: Array.isArray(p.similar_entities) ? p.similar_entities : [],
          position: p.position,
        })),
    }));
    setEcosystem(mapped);
    setOpenEntities((prev) => {
      const next = { ...prev };
      mapped.forEach((e) => {
        if (next[e.id] === undefined) next[e.id] = true;
      });
      return next;
    });
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const seedDefaults = async (userId: string) => {
    for (let i = 0; i < DEFAULT_ECOSYSTEM.length; i++) {
      const e = DEFAULT_ECOSYSTEM[i];
      const { data: ent, error } = await supabase
        .from("portfolio_entities")
        .insert({ user_id: userId, name: e.name, subtitle: e.subtitle, position: i })
        .select()
        .single();
      if (error || !ent) continue;
      const rows = e.children.map((c, j) => ({
        entity_id: ent.id,
        user_id: userId,
        name: c.name,
        core_engine_title: c.coreEngine?.title || null,
        core_engine_flow: c.coreEngine?.flow || null,
        functional_product: c.functionalProduct,
        business_engine: c.businessEngine,
        similar_entities: c.similar as any,
        position: j,
      }));
      await supabase.from("portfolio_products").insert(rows);
    }
    await load();
  };

  useEffect(() => {
    load();
  }, [load]);

  /* ---------- entity actions ---------- */

  const openAddEntity = () => {
    setEntityWord("");
    setEntityCode("");
    setEntityDialog({ mode: "add" });
  };

  const openEditEntity = (entity: Entity) => {
    setEntityWord(entity.subtitle.replace(/^Box 4\s+/i, "").replace(/\s+Solutions.*$/i, "") || entity.name);
    setEntityCode(entity.name);
    setEntityDialog({ mode: "edit", entity });
  };

  const saveEntity = async () => {
    const word = entityWord.trim();
    if (!word || !user) return;
    const subtitle = `Box 4 ${word} Solutions`;
    const code = entityCode.trim() || `B4${word.slice(0, 1).toUpperCase()}S`;

    if (entityDialog?.mode === "edit" && entityDialog.entity) {
      const { error } = await supabase
        .from("portfolio_entities")
        .update({ name: code, subtitle })
        .eq("id", entityDialog.entity.id);
      if (error) return toast.error(error.message);
      toast.success("Entity updated");
    } else {
      const { error } = await supabase
        .from("portfolio_entities")
        .insert({ user_id: user.id, name: code, subtitle, position: ecosystem.length });
      if (error) return toast.error(error.message);
      toast.success("Entity added");
    }
    setEntityDialog(null);
    load();
  };

  const deleteEntity = async (entity: Entity) => {
    const { error } = await supabase.from("portfolio_entities").delete().eq("id", entity.id);
    if (error) return toast.error(error.message);
    toast.success("Entity deleted");
    load();
  };

  /* ---------- product actions ---------- */

  const openAddProduct = (entity: Entity) => {
    setProductForm(emptyProductForm);
    setProductDialog({ entity });
  };

  const openEditProduct = (entity: Entity, product: Product) => {
    setProductForm({
      name: product.name,
      coreEngineTitle: product.core_engine_title,
      coreEngineFlow: product.core_engine_flow,
      functionalProduct: product.functional_product,
      businessEngine: product.business_engine.join("\n"),
      similar: similarToLines(product.similar_entities),
    });
    setProductDialog({ entity, product });
  };

  const generateWithAI = async () => {
    if (!productDialog || !productForm.name.trim()) {
      toast.error("Enter a product name first");
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-portfolio-content", {
        body: {
          entityName: productDialog.entity.name,
          entitySubtitle: productDialog.entity.subtitle,
          productName: productForm.name.trim(),
          hint: productForm.functionalProduct.trim(),
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setProductForm((f) => ({
        ...f,
        coreEngineTitle: (data as any).core_engine_title || f.coreEngineTitle,
        coreEngineFlow: (data as any).core_engine_flow || f.coreEngineFlow,
        functionalProduct: (data as any).functional_product || f.functionalProduct,
        businessEngine: ((data as any).business_engine || []).join("\n") || f.businessEngine,
        similar: similarToLines((data as any).similar_entities || []) || f.similar,
      }));
      toast.success("Draft generated — edit freely");
    } catch (e: any) {
      toast.error(e?.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const saveProduct = async () => {
    if (!productDialog || !user || !productForm.name.trim()) return;
    const payload = {
      name: productForm.name.trim(),
      core_engine_title: productForm.coreEngineTitle.trim() || null,
      core_engine_flow: productForm.coreEngineFlow.trim() || null,
      functional_product: productForm.functionalProduct.trim(),
      business_engine: linesToList(productForm.businessEngine),
      similar_entities: linesToSimilar(productForm.similar) as any,
    };

    if (productDialog.product) {
      const { error } = await supabase
        .from("portfolio_products")
        .update(payload)
        .eq("id", productDialog.product.id);
      if (error) return toast.error(error.message);
      toast.success("Product updated");
    } else {
      const { error } = await supabase.from("portfolio_products").insert({
        ...payload,
        entity_id: productDialog.entity.id,
        user_id: user.id,
        position: productDialog.entity.children.length,
      });
      if (error) return toast.error(error.message);
      toast.success("Product added");
    }
    setProductDialog(null);
    setProductForm(emptyProductForm);
    load();
  };

  const deleteProduct = async (product: Product) => {
    const { error } = await supabase.from("portfolio_products").delete().eq("id", product.id);
    if (error) return toast.error(error.message);
    toast.success("Product deleted");
    load();
  };

  /* ---------- section actions ---------- */

  const openSectionEditor = (product: Product, section: SectionKey) => {
    if (section === "core") {
      setSectionValueA(product.core_engine_title);
      setSectionValueB(product.core_engine_flow);
    } else if (section === "functional") {
      setSectionValueA(product.functional_product);
    } else if (section === "business") {
      setSectionValueA(product.business_engine.join("\n"));
    } else {
      setSectionValueA(similarToLines(product.similar_entities));
    }
    setSectionDialog({ product, section });
  };

  const sectionPayload = (section: SectionKey, a: string, b: string): Record<string, any> => {
    switch (section) {
      case "core":
        return { core_engine_title: a.trim() || null, core_engine_flow: b.trim() || null };
      case "functional":
        return { functional_product: a.trim() };
      case "business":
        return { business_engine: linesToList(a) };
      case "similar":
        return { similar_entities: linesToSimilar(a) as any };
    }
  };

  const saveSection = async () => {
    if (!sectionDialog) return;
    const { error } = await supabase
      .from("portfolio_products")
      .update(sectionPayload(sectionDialog.section, sectionValueA, sectionValueB))
      .eq("id", sectionDialog.product.id);
    if (error) return toast.error(error.message);
    toast.success("Section updated");
    setSectionDialog(null);
    load();
  };

  const clearSection = async (product: Product, section: SectionKey) => {
    const { error } = await supabase
      .from("portfolio_products")
      .update(sectionPayload(section, "", ""))
      .eq("id", product.id);
    if (error) return toast.error(error.message);
    toast.success("Section cleared");
    load();
  };

  const sectionLabel: Record<SectionKey, string> = {
    core: "Core Engine",
    functional: "Functional Product",
    business: "Business Engine",
    similar: "Similar entities",
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-16 max-w-5xl">
        <header className="mb-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Badge variant="secondary" className="mb-3">Portfolio</Badge>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Box 4 Group / Solutions Ecosystem
            </h1>
            <p className="text-muted-foreground mt-3 max-w-2xl">
              Every entity in the group mapped by its core engine, functional product, business
              engine, and comparable players in the market.
            </p>
          </div>
          {canEdit && (
            <Button onClick={openAddEntity}>
              <Plus className="h-4 w-4 mr-1" /> Box 4 … Solutions
            </Button>
          )}
        </header>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading portfolio…
          </div>
        ) : (
          <div className="relative space-y-8 md:pl-8 md:before:absolute md:before:left-2 md:before:top-4 md:before:bottom-4 md:before:w-px md:before:bg-border">
            {ecosystem.map((entity) => (
              <section key={entity.id} className="relative">
                <div className="hidden md:block absolute -left-[26px] top-7 h-px w-6 bg-border" />
                <Collapsible
                  open={openEntities[entity.id] ?? true}
                  onOpenChange={(o) => setOpenEntities((p) => ({ ...p, [entity.id]: o }))}
                >
                  <Card className="border-border/80">
                    <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-3 p-6">
                      <CollapsibleTrigger className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left">
                        <div>
                          <h2 className="text-xl font-bold tracking-tight">{entity.name}</h2>
                          {entity.subtitle && (
                            <p className="text-sm text-muted-foreground">{entity.subtitle}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary">{entity.children.length}</Badge>
                          <ChevronDown
                            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                              (openEntities[entity.id] ?? true) ? "rotate-180" : ""
                            }`}
                          />
                        </div>
                      </CollapsibleTrigger>
                      {canEdit && (
                        <div className="flex shrink-0 items-center gap-1">
                          <Button size="sm" variant="outline" onClick={() => openAddProduct(entity)}>
                            <Plus className="h-4 w-4 mr-1" /> Product
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => openEditEntity(entity)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setConfirmDelete({ kind: "entity", entity })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <CollapsibleContent>
                      <CardContent className="px-6 pb-6 pt-0 space-y-4">
                        {entity.children.length === 0 && (
                          <p className="text-sm text-muted-foreground">No products yet.</p>
                        )}
                        {entity.children.map((product) => (
                          <Collapsible
                            key={product.id}
                            open={openProducts[product.id] ?? false}
                            onOpenChange={(o) => setOpenProducts((p) => ({ ...p, [product.id]: o }))}
                          >
                            <div className="rounded-lg border border-border bg-card/60">
                              <div className="flex w-full items-center justify-between gap-2 px-5 py-4">
                                <CollapsibleTrigger className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left">
                                  <div>
                                    <h3 className="font-semibold">{product.name}</h3>
                                    {product.core_engine_title && (
                                      <p className="text-xs text-muted-foreground">
                                        {product.core_engine_title}
                                      </p>
                                    )}
                                  </div>
                                  <ChevronDown
                                    className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                                      openProducts[product.id] ? "rotate-180" : ""
                                    }`}
                                  />
                                </CollapsibleTrigger>
                                {canEdit && (
                                  <div className="flex shrink-0 items-center gap-1">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8"
                                      onClick={() => openEditProduct(entity, product)}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8 text-destructive hover:text-destructive"
                                      onClick={() => setConfirmDelete({ kind: "product", product })}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                              <CollapsibleContent>
                                <div className="px-5 pb-5 pt-1">
                                  <ProductBody
                                    product={product}
                                    canEdit={canEdit}
                                    onEditSection={(s) => openSectionEditor(product, s)}
                                    onClearSection={(s) =>
                                      setConfirmDelete({ kind: "section", product, section: s })
                                    }
                                  />
                                </div>
                              </CollapsibleContent>
                            </div>
                          </Collapsible>
                        ))}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              </section>
            ))}
          </div>
        )}
      </main>
      <Footer />

      {/* Entity dialog */}
      <Dialog open={!!entityDialog} onOpenChange={(o) => !o && setEntityDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {entityDialog?.mode === "edit" ? "Edit entity" : "Add a Box 4 … Solutions entity"}
            </DialogTitle>
            <DialogDescription>
              Name the vertical, e.g. "Health" → Box 4 Health Solutions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ent-word">Vertical</Label>
              <Input
                id="ent-word"
                value={entityWord}
                onChange={(e) => setEntityWord(e.target.value)}
                placeholder="Health, Digital, Transformation…"
              />
              <p className="text-xs text-muted-foreground">
                Box 4 {entityWord.trim() || "…"} Solutions
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ent-code">Short code (optional)</Label>
              <Input
                id="ent-code"
                value={entityCode}
                onChange={(e) => setEntityCode(e.target.value)}
                placeholder="B4HS"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEntityDialog(null)}>Cancel</Button>
            <Button onClick={saveEntity} disabled={!entityWord.trim()}>
              {entityDialog?.mode === "edit" ? "Save changes" : "Add entity"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product dialog */}
      <Dialog open={!!productDialog} onOpenChange={(o) => !o && setProductDialog(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {productDialog?.product ? "Edit product" : `Add product to ${productDialog?.entity.name}`}
            </DialogTitle>
            <DialogDescription>
              Define the functional product, business engine, and similar entities — or generate a draft with AI.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="p-name">Product name</Label>
              <div className="flex gap-2">
                <Input
                  id="p-name"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={generateWithAI}
                  disabled={generating || !productForm.name.trim()}
                  className="shrink-0"
                >
                  {generating ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-1" />
                  )}
                  AI Generate
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="p-ce">Core engine (optional)</Label>
                <Input
                  id="p-ce"
                  value={productForm.coreEngineTitle}
                  onChange={(e) => setProductForm({ ...productForm, coreEngineTitle: e.target.value })}
                  placeholder="Trust Engine"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-cf">Engine flow</Label>
                <Input
                  id="p-cf"
                  value={productForm.coreEngineFlow}
                  onChange={(e) => setProductForm({ ...productForm, coreEngineFlow: e.target.value })}
                  placeholder="Uncertainty → Trusted decisions"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-fp">Functional product</Label>
              <Textarea
                id="p-fp"
                value={productForm.functionalProduct}
                onChange={(e) => setProductForm({ ...productForm, functionalProduct: e.target.value })}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-be">Business engine (one per line)</Label>
              <Textarea
                id="p-be"
                value={productForm.businessEngine}
                onChange={(e) => setProductForm({ ...productForm, businessEngine: e.target.value })}
                rows={3}
                placeholder={"SaaS subscriptions\nAdvisory services"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-se">Similar entities (one per line: Name — note)</Label>
              <Textarea
                id="p-se"
                value={productForm.similar}
                onChange={(e) => setProductForm({ ...productForm, similar: e.target.value })}
                rows={3}
                placeholder={"Asana — coordination software"}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProductDialog(null)}>Cancel</Button>
            <Button onClick={saveProduct} disabled={!productForm.name.trim()}>
              {productDialog?.product ? "Save changes" : "Add product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Section dialog */}
      <Dialog open={!!sectionDialog} onOpenChange={(o) => !o && setSectionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {sectionDialog ? sectionLabel[sectionDialog.section] : ""}</DialogTitle>
            <DialogDescription>{sectionDialog?.product.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {sectionDialog?.section === "core" ? (
              <>
                <div className="space-y-2">
                  <Label>Core engine title</Label>
                  <Input value={sectionValueA} onChange={(e) => setSectionValueA(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Engine flow</Label>
                  <Input value={sectionValueB} onChange={(e) => setSectionValueB(e.target.value)} />
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <Label>
                  {sectionDialog?.section === "functional"
                    ? "Functional product"
                    : sectionDialog?.section === "business"
                      ? "Business engine (one per line)"
                      : "Similar entities (one per line: Name — note)"}
                </Label>
                <Textarea
                  value={sectionValueA}
                  onChange={(e) => setSectionValueA(e.target.value)}
                  rows={sectionDialog?.section === "functional" ? 3 : 5}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSectionDialog(null)}>Cancel</Button>
            <Button onClick={saveSection}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDelete?.kind === "entity"
                ? `Delete ${confirmDelete.entity.name}?`
                : confirmDelete?.kind === "product"
                  ? `Delete ${confirmDelete.product.name}?`
                  : `Clear ${confirmDelete ? sectionLabel[confirmDelete.section] : ""}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.kind === "entity"
                ? "This removes the entity and all of its products. This cannot be undone."
                : confirmDelete?.kind === "product"
                  ? "This removes the product and all of its sections."
                  : "This clears the section content. You can fill it again later."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!confirmDelete) return;
                if (confirmDelete.kind === "entity") await deleteEntity(confirmDelete.entity);
                else if (confirmDelete.kind === "product") await deleteProduct(confirmDelete.product);
                else await clearSection(confirmDelete.product, confirmDelete.section);
                setConfirmDelete(null);
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
