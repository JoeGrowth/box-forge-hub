import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Navbar } from "@/components/layout/Navbar";

type Person = { id: string; name: string; amount: number };
type Mission = {
  id: string;
  name: string;
  priceHT: number;
  external: Person[];
  internal: Person[];
};

const EXTERNALS = ["Aziz", "Bader", "Hamza", "Mehdi"];
const INTERNALS = ["Houssem (Structure Handler)", "Youssef (Process Handler)"];
const STORAGE_KEY = "declaration_missions_v1";

const uid = () => Math.random().toString(36).slice(2, 10);
const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

const emptyMission = (): Mission => ({
  id: uid(),
  name: "Nouvelle mission",
  priceHT: 0,
  external: [],
  internal: [],
});

export default function Declaration() {
  const [missions, setMissions] = useState<Mission[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setMissions(JSON.parse(raw));
      else setMissions([emptyMission()]);
    } catch {
      setMissions([emptyMission()]);
    }
  }, []);

  useEffect(() => {
    if (missions.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(missions));
  }, [missions]);

  const update = (id: string, patch: Partial<Mission>) =>
    setMissions((ms) => ms.map((m) => (m.id === id ? { ...m, ...patch } : m)));

  const addPerson = (id: string, kind: "external" | "internal") =>
    setMissions((ms) =>
      ms.map((m) =>
        m.id === id ? { ...m, [kind]: [...m[kind], { id: uid(), name: "", amount: 0 }] } : m,
      ),
    );

  const updatePerson = (
    id: string,
    kind: "external" | "internal",
    pid: string,
    patch: Partial<Person>,
  ) =>
    setMissions((ms) =>
      ms.map((m) =>
        m.id === id
          ? { ...m, [kind]: m[kind].map((p) => (p.id === pid ? { ...p, ...patch } : p)) }
          : m,
      ),
    );

  const removePerson = (id: string, kind: "external" | "internal", pid: string) =>
    setMissions((ms) =>
      ms.map((m) => (m.id === id ? { ...m, [kind]: m[kind].filter((p) => p.id !== pid) } : m)),
    );

  const removeMission = (id: string) => setMissions((ms) => ms.filter((m) => m.id !== id));

  const totals = useMemo(() => {
    return missions.map((m) => {
      const ext = m.external.reduce((s, p) => s + (+p.amount || 0), 0);
      const int = m.internal.reduce((s, p) => s + (+p.amount || 0), 0);
      const reste = (+m.priceHT || 0) - ext - int;
      const recognition = reste * 0.3;
      const investment = reste * 0.7;
      return {
        ext,
        int,
        reste,
        recognition,
        investment,
        associe1: recognition * 0.7,
        associe2: recognition * 0.3,
        infra: investment * 0.4,
        lab: investment * 0.6,
      };
    });
  }, [missions]);

  const grand = useMemo(() => {
    const sum = (k: keyof (typeof totals)[number]) =>
      totals.reduce((s, t) => s + (t[k] as number), 0);
    return {
      priceHT: missions.reduce((s, m) => s + (+m.priceHT || 0), 0),
      ext: sum("ext"),
      int: sum("int"),
      reste: sum("reste"),
      recognition: sum("recognition"),
      investment: sum("investment"),
      associe1: sum("associe1"),
      associe2: sum("associe2"),
      infra: sum("infra"),
      lab: sum("lab"),
    };
  }, [totals, missions]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Déclaration des Missions</h1>
            <p className="text-muted-foreground mt-1">
              Répartition automatique : Reste → Recognition 30% / Investment 70%.
            </p>
          </div>
          <Button onClick={() => setMissions((m) => [...m, emptyMission()])}>
            <Plus className="h-4 w-4 mr-2" /> Ajouter une mission
          </Button>
        </div>

        <div className="space-y-6">
          {missions.map((m, idx) => {
            const t = totals[idx];
            return (
              <Card key={m.id} className="overflow-hidden">
                <CardHeader className="bg-muted/30 flex flex-row items-center justify-between gap-4 space-y-0">
                  <Input
                    value={m.name}
                    onChange={(e) => update(m.id, { name: e.target.value })}
                    className="text-lg font-semibold max-w-md bg-background"
                  />
                  <Button variant="ghost" size="icon" onClick={() => removeMission(m.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Prix HT (€)</Label>
                      <Input
                        type="number"
                        value={m.priceHT || ""}
                        onChange={(e) => update(m.id, { priceHT: +e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* External */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">Externes</h3>
                      <Button size="sm" variant="outline" onClick={() => addPerson(m.id, "external")}>
                        <Plus className="h-3 w-3 mr-1" /> Ajouter
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {m.external.map((p) => (
                        <div key={p.id} className="flex gap-2 items-center">
                          <Select
                            value={p.name}
                            onValueChange={(v) => updatePerson(m.id, "external", p.id, { name: v })}
                          >
                            <SelectTrigger className="flex-1"><SelectValue placeholder="Personne" /></SelectTrigger>
                            <SelectContent>
                              {EXTERNALS.map((n) => (
                                <SelectItem key={n} value={n}>{n}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            className="w-40"
                            placeholder="Montant"
                            value={p.amount || ""}
                            onChange={(e) =>
                              updatePerson(m.id, "external", p.id, { amount: +e.target.value })
                            }
                          />
                          <Button variant="ghost" size="icon" onClick={() => removePerson(m.id, "external", p.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <div className="text-sm text-muted-foreground">Total externes : <strong>{fmt(t?.ext || 0)} €</strong></div>
                    </div>
                  </div>

                  {/* Internal */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">Internes</h3>
                      <Button size="sm" variant="outline" onClick={() => addPerson(m.id, "internal")}>
                        <Plus className="h-3 w-3 mr-1" /> Ajouter
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {m.internal.map((p) => (
                        <div key={p.id} className="flex gap-2 items-center">
                          <Select
                            value={p.name}
                            onValueChange={(v) => updatePerson(m.id, "internal", p.id, { name: v })}
                          >
                            <SelectTrigger className="flex-1"><SelectValue placeholder="Personne" /></SelectTrigger>
                            <SelectContent>
                              {INTERNALS.map((n) => (
                                <SelectItem key={n} value={n}>{n}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            className="w-40"
                            placeholder="Montant"
                            value={p.amount || ""}
                            onChange={(e) =>
                              updatePerson(m.id, "internal", p.id, { amount: +e.target.value })
                            }
                          />
                          <Button variant="ghost" size="icon" onClick={() => removePerson(m.id, "internal", p.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <div className="text-sm text-muted-foreground">Total internes : <strong>{fmt(t?.int || 0)} €</strong></div>
                    </div>
                  </div>

                  <Separator />

                  {/* Distribution */}
                  <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
                    <div className="flex justify-between text-base">
                      <span className="font-semibold">Reste Structure</span>
                      <span className="font-bold">{fmt(t?.reste || 0)} €</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="rounded-md bg-background p-3 border">
                        <div className="flex justify-between mb-2">
                          <span className="font-medium">Recognition (30%)</span>
                          <span className="font-semibold">{fmt(t?.recognition || 0)} €</span>
                        </div>
                        <div className="text-sm space-y-1 pl-2 border-l-2 border-primary/30">
                          <div className="flex justify-between"><span>Associé 1 (70%)</span><span>{fmt(t?.associe1 || 0)} €</span></div>
                          <div className="flex justify-between"><span>Associé 2 (30%)</span><span>{fmt(t?.associe2 || 0)} €</span></div>
                        </div>
                      </div>
                      <div className="rounded-md bg-background p-3 border">
                        <div className="flex justify-between mb-2">
                          <span className="font-medium">Investment (70%)</span>
                          <span className="font-semibold">{fmt(t?.investment || 0)} €</span>
                        </div>
                        <div className="text-sm space-y-1 pl-2 border-l-2 border-primary/30">
                          <div className="flex justify-between"><span>Infra (40%)</span><span>{fmt(t?.infra || 0)} €</span></div>
                          <div className="flex justify-between"><span>Lab (60%)</span><span>{fmt(t?.lab || 0)} €</span></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Grand totals */}
        {missions.length > 1 && (
          <Card className="mt-8 border-primary/40">
            <CardHeader>
              <CardTitle>Totaux globaux</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <Stat label="Prix HT" value={grand.priceHT} />
              <Stat label="Externes" value={grand.ext} />
              <Stat label="Internes" value={grand.int} />
              <Stat label="Reste" value={grand.reste} />
              <Stat label="Recognition" value={grand.recognition} />
              <Stat label="Associé 1" value={grand.associe1} />
              <Stat label="Associé 2" value={grand.associe2} />
              <Stat label="Investment" value={grand.investment} />
              <Stat label="Infra" value={grand.infra} />
              <Stat label="Lab" value={grand.lab} />
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border p-3 bg-muted/20">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-semibold">{fmt(value)} €</div>
    </div>
  );
}
