import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Users, Boxes, Building2, GripVertical } from "lucide-react";

type BoardKey = "people" | "products" | "organizations";

interface KanbanItem {
  id: string;
  title: string;
  subtitle?: string | null;
  imageUrl?: string | null;
}

const BOARDS: Record<
  BoardKey,
  { label: string; icon: typeof Users; blurb: string; columns: { key: string; label: string; description: string }[] }
> = {
  people: {
    label: "People",
    icon: Users,
    blurb: "Move talent through your engagement pipeline.",
    columns: [
      { key: "prospect", label: "Prospect", description: "New talent you are tracking but have not contacted yet." },
      { key: "contacted", label: "Contacted", description: "You reached out and are waiting for a response." },
      { key: "engaged", label: "Engaged", description: "Active conversation or interview in progress." },
      { key: "onboarded", label: "Onboarded", description: "Hired, contracted, or formally joined the team." },
    ],
  },
  products: {
    label: "Products",
    icon: Boxes,
    blurb: "Track each product from concept to scale.",
    columns: [
      { key: "idea", label: "Idea", description: "Concept defined but not yet being built." },
      { key: "building", label: "Building", description: "Actively in design, build, or validation." },
      { key: "shipped", label: "Shipped", description: "Released to users and collecting feedback." },
      { key: "scaling", label: "Scaling", description: "Expanding reach, revenue, or operations." },
    ],
  },
  organizations: {
    label: "Organizations",
    icon: Building2,
    blurb: "Follow entities from watchlist to active partnership.",
    columns: [
      { key: "watchlist", label: "Watchlist", description: "Organizations you are monitoring for future potential." },
      { key: "discussing", label: "Discussing", description: "Initial conversations or negotiations underway." },
      { key: "partner", label: "Partner", description: "Formal agreement or active collaboration in place." },
      { key: "active", label: "Active", description: "Deep integration and ongoing joint operations." },
    ],
  },
};

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("");

function Board({ board }: { board: BoardKey }) {
  const { user } = useAuth();
  const config = BOARDS[board];
  const [items, setItems] = useState<KanbanItem[]>([]);
  const [placements, setPlacements] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let mapped: KanbanItem[] = [];

    if (board === "people") {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, professional_title, draft_title")
        .not("full_name", "is", null)
        .limit(120);
      mapped = ((data as any[]) ?? []).map((p) => ({
        id: p.user_id,
        title: p.full_name ?? "Unnamed",
        subtitle: p.professional_title ?? p.draft_title ?? null,
        imageUrl: p.avatar_url,
      }));
    } else if (board === "products") {
      const { data } = await supabase
        .from("portfolio_products")
        .select("id, name, core_engine_title, functional_product")
        .order("position", { ascending: true })
        .limit(200);
      mapped = ((data as any[]) ?? []).map((p) => ({
        id: p.id,
        title: p.name,
        subtitle: p.core_engine_title ?? p.functional_product ?? null,
      }));
    } else {
      const { data } = await supabase
        .from("organizations")
        .select("id, name, type, description, logo_url")
        .limit(200);
      mapped = ((data as any[]) ?? []).map((o) => ({
        id: o.id,
        title: o.name,
        subtitle: o.type ?? o.description ?? null,
        imageUrl: o.logo_url,
      }));
    }

    let placementMap: Record<string, string> = {};
    if (user) {
      const { data: rows } = await supabase
        .from("kanban_placements")
        .select("item_id, column_key")
        .eq("user_id", user.id)
        .eq("board", board);
      ((rows as any[]) ?? []).forEach((r) => {
        placementMap[r.item_id] = r.column_key;
      });
    }

    setItems(mapped);
    setPlacements(placementMap);
    setLoading(false);
  }, [board, user]);

  useEffect(() => {
    load();
  }, [load]);

  const columnOf = useCallback(
    (id: string) => placements[id] ?? config.columns[0].key,
    [placements, config.columns],
  );

  const grouped = useMemo(() => {
    const map: Record<string, KanbanItem[]> = {};
    config.columns.forEach((c) => (map[c.key] = []));
    items.forEach((item) => {
      const key = columnOf(item.id);
      (map[key] ?? map[config.columns[0].key]).push(item);
    });
    return map;
  }, [items, columnOf, config.columns]);

  const move = async (itemId: string, columnKey: string) => {
    const previous = columnOf(itemId);
    if (previous === columnKey) return;
    setPlacements((p) => ({ ...p, [itemId]: columnKey }));
    if (!user) return;
    const { error } = await supabase
      .from("kanban_placements")
      .upsert(
        { user_id: user.id, board, item_id: itemId, column_key: columnKey },
        { onConflict: "user_id,board,item_id" },
      );
    if (error) {
      setPlacements((p) => ({ ...p, [itemId]: previous }));
      toast.error("Could not save the move");
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {config.columns.map((c) => (
          <Skeleton key={c.key} className="h-64 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {config.columns.map((column) => {
        const cards = grouped[column.key] ?? [];
        const isOver = overColumn === column.key;
        return (
          <div
            key={column.key}
            onDragOver={(e) => {
              e.preventDefault();
              setOverColumn(column.key);
            }}
            onDragLeave={() => setOverColumn((c) => (c === column.key ? null : c))}
            onDrop={(e) => {
              e.preventDefault();
              setOverColumn(null);
              if (dragging) move(dragging, column.key);
              setDragging(null);
            }}
            className={`rounded-xl border bg-muted/30 p-3 transition-colors ${
              isOver ? "border-primary bg-primary/5" : "border-border"
            }`}
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold">{column.label}</h3>
                <p className="text-xs text-muted-foreground">{column.description}</p>
              </div>
              <Badge variant="secondary" className="mt-0.5 shrink-0">{cards.length}</Badge>
            </div>

            <div className="space-y-2 min-h-[120px]">
              {cards.map((item) => (
                <Card
                  key={item.id}
                  draggable
                  onDragStart={() => setDragging(item.id)}
                  onDragEnd={() => {
                    setDragging(null);
                    setOverColumn(null);
                  }}
                  className={`flex cursor-grab items-center gap-3 p-3 active:cursor-grabbing ${
                    dragging === item.id ? "opacity-50" : ""
                  }`}
                >
                  <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
                  {board !== "products" && (
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={item.imageUrl ?? undefined} alt={item.title} />
                      <AvatarFallback className="text-xs">{initials(item.title)}</AvatarFallback>
                    </Avatar>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    {item.subtitle && (
                      <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
                    )}
                  </div>
                </Card>
              ))}
              {cards.length === 0 && (
                <p className="px-1 py-6 text-center text-xs text-muted-foreground">
                  Drop cards here
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Kanban() {
  const [board, setBoard] = useState<BoardKey>("people");

  useEffect(() => {
    document.title = "Kanban Boards | Box 4 Solutions";
  }, []);

  const Icon = BOARDS[board].icon;

  return (
    <main className="container mx-auto max-w-7xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Kanban</h1>
        <p className="mt-1 text-muted-foreground">
          Drag cards between columns to organize people, products and organizations. Your board is
          private to you.
        </p>
      </header>

      <Tabs value={board} onValueChange={(v) => setBoard(v as BoardKey)}>
        <TabsList className="mb-4">
          {(Object.keys(BOARDS) as BoardKey[]).map((key) => (
            <TabsTrigger key={key} value={key}>
              {BOARDS[key].label}
            </TabsTrigger>
          ))}
        </TabsList>

        <p className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Icon className="h-4 w-4" />
          {BOARDS[board].blurb}
        </p>

        {(Object.keys(BOARDS) as BoardKey[]).map((key) => (
          <TabsContent key={key} value={key}>
            {board === key && <Board board={key} />}
          </TabsContent>
        ))}
      </Tabs>
    </main>
  );
}
