import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

const STAGES = [
  "Idéation & Cadrage technique",
  "Prototypage (V1, V2, V3)",
  "Test Terrain / Validation clinique",
  "Go-to-Market (Lancement)",
  "Spin-off (Entité juridique indépendante)",
];
const ROLES = [
  "Product Owner / Lead Project",
  "Développeurs / Ingénieurs hardware ou software",
  "Experts Médicaux / Consultants spécialisés",
];
const STATUS = ["À faire", "En cours", "Terminé", "En attente de paiement"];

type Project = {
  id: string;
  product_name: string;
  lifecycle_stages: string[];
  team_roles: string[];
  partners: string[];
  objectives: string[];
};
type Mission = {
  id: string;
  project_code: string;
  mission_name: string;
  consultants: string | null;
  tjm: string | null;
  status: string | null;
  pipeline: string | null;
};

export default function ThreeS() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);

  // project form
  const [pName, setPName] = useState("");
  const [pStages, setPStages] = useState<string[]>([]);
  const [pRoles, setPRoles] = useState<string[]>([]);
  const [pPartners, setPPartners] = useState("");
  const [pObjectives, setPObjectives] = useState("");

  // mission form
  const [mCode, setMCode] = useState("");
  const [mName, setMName] = useState("");
  const [mConsultants, setMConsultants] = useState("");
  const [mTjm, setMTjm] = useState("");
  const [mStatus, setMStatus] = useState("À faire");
  const [mPipeline, setMPipeline] = useState("");

  const fetchAll = async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      const [p, m] = await Promise.all([
        supabase.from("tracker_projects").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("tracker_missions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      ]);
      setProjects((p.data as Project[]) || []);
      setMissions((m.data as Mission[]) || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [user]);

  const toggle = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];

  const addProject = async () => {
    if (!user || !pName.trim()) return;
    const { error } = await supabase.from("tracker_projects").insert({
      user_id: user.id,
      product_name: pName.trim(),
      lifecycle_stages: pStages,
      team_roles: pRoles,
      partners: pPartners.split("\n").map(s => s.trim()).filter(Boolean),
      objectives: pObjectives.split("\n").map(s => s.trim()).filter(Boolean),
    });
    if (error) return toast.error(error.message);
    toast.success("Projet ajouté");
    setPName(""); setPStages([]); setPRoles([]); setPPartners(""); setPObjectives("");
    fetchAll();
  };

  const deleteProject = async (id: string) => {
    await supabase.from("tracker_projects").delete().eq("id", id);
    fetchAll();
  };

  const addMission = async () => {
    if (!user || !mCode.trim() || !mName.trim()) return;
    const { error } = await supabase.from("tracker_missions").insert({
      user_id: user.id,
      project_code: mCode.trim(),
      mission_name: mName.trim(),
      consultants: mConsultants,
      tjm: mTjm,
      status: mStatus,
      pipeline: mPipeline,
    });
    if (error) return toast.error(error.message);
    toast.success("Mission ajoutée");
    setMCode(""); setMName(""); setMConsultants(""); setMTjm(""); setMStatus("À faire"); setMPipeline("");
    fetchAll();
  };

  const deleteMission = async (id: string) => {
    await supabase.from("tracker_missions").delete().eq("id", id);
    fetchAll();
  };

  const updateMissionStatus = async (id: string, status: string) => {
    await supabase.from("tracker_missions").update({ status }).eq("id", id);
    fetchAll();
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="mb-4">Connectez-vous pour accéder au 3S Tracker.</p>
            <Button onClick={() => (window.location.href = "/auth")}>Se connecter</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 pt-24 max-w-6xl">
        <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
          <div className="flex-1 min-w-[260px]">
            <h1 className="text-3xl font-bold tracking-tight">3S Tracker</h1>
            <p className="text-muted-foreground mt-1">
              Suivi des projets d'innovation et des missions de consulting.
            </p>
          </div>
        </div>

      <Tabs defaultValue="projects">
        <TabsList>
          <TabsTrigger value="projects">Projets / Innovations</TabsTrigger>
          <TabsTrigger value="missions">Missions Consultants</TabsTrigger>
        </TabsList>

        {/* PROJECTS */}
        <TabsContent value="projects" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Ajouter un Projet</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Nom du Produit / Innovation</Label>
                <Input value={pName} onChange={e => setPName(e.target.value)} placeholder="ex: Smart Cigarette Case" />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Stade d'Avancement (Cycle de Vie)</Label>
                  <div className="space-y-2 mt-2">
                    {STAGES.map(s => (
                      <label key={s} className="flex items-center gap-2 text-sm">
                        <Checkbox checked={pStages.includes(s)} onCheckedChange={() => setPStages(toggle(pStages, s))} />
                        {s}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <Label>L'Équipe Dédiée</Label>
                  <div className="space-y-2 mt-2">
                    {ROLES.map(r => (
                      <label key={r} className="flex items-center gap-2 text-sm">
                        <Checkbox checked={pRoles.includes(r)} onCheckedChange={() => setPRoles(toggle(pRoles, r))} />
                        {r}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Partenaires Institutionnels (un par ligne)</Label>
                  <Textarea value={pPartners} onChange={e => setPPartners(e.target.value)} placeholder="ex: CHU pour validation hospitalière" />
                </div>
                <div>
                  <Label>Objectif Actuel & Prochain Jalon (un par ligne)</Label>
                  <Textarea value={pObjectives} onChange={e => setPObjectives(e.target.value)} placeholder="ex: Finaliser le modèle économique" />
                </div>
              </div>
              <Button onClick={addProject}><Plus className="h-4 w-4 mr-2" />Ajouter Projet</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Projets ({projects.length})</CardTitle></CardHeader>
            <CardContent>
              {projects.length === 0 ? (
                <p className="text-muted-foreground text-sm">Aucun projet.</p>
              ) : (
                <div className="space-y-4">
                  {projects.map(p => (
                    <div key={p.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-semibold text-lg">{p.product_name}</h3>
                        <Button variant="ghost" size="icon" onClick={() => deleteProject(p.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <div className="grid md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="font-medium mb-1">Stade</p>
                          <div className="flex flex-wrap gap-1">
                            {p.lifecycle_stages.map(s => <Badge key={s} variant="secondary">{s}</Badge>)}
                          </div>
                        </div>
                        <div>
                          <p className="font-medium mb-1">Équipe</p>
                          <div className="flex flex-wrap gap-1">
                            {p.team_roles.map(s => <Badge key={s} variant="outline">{s}</Badge>)}
                          </div>
                        </div>
                        <div>
                          <p className="font-medium mb-1">Partenaires</p>
                          <ul className="list-disc list-inside text-muted-foreground">
                            {p.partners.map((x, i) => <li key={i}>{x}</li>)}
                          </ul>
                        </div>
                        <div>
                          <p className="font-medium mb-1">Objectifs</p>
                          <ul className="list-disc list-inside text-muted-foreground">
                            {p.objectives.map((x, i) => <li key={i}>{x}</li>)}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* MISSIONS */}
        <TabsContent value="missions" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Ajouter une Mission</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>ID du Projet</Label>
                  <Input value={mCode} onChange={e => setMCode(e.target.value)} placeholder="ex: S3-01" />
                </div>
                <div>
                  <Label>Projet / Mission</Label>
                  <Input value={mName} onChange={e => setMName(e.target.value)} placeholder="ex: Diagnostic institutionnel" />
                </div>
                <div>
                  <Label>Consultant(s) Assigné(s)</Label>
                  <Input value={mConsultants} onChange={e => setMConsultants(e.target.value)} placeholder="Nom(s) du/des consultant(s)" />
                </div>
                <div>
                  <Label>TJM (DT / homme-jour)</Label>
                  <Input value={mTjm} onChange={e => setMTjm(e.target.value)} placeholder="ex: 800" />
                </div>
                <div>
                  <Label>Statut</Label>
                  <Select value={mStatus} onValueChange={setMStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Pipeline "To Sell" (Veille)</Label>
                <Textarea value={mPipeline} onChange={e => setMPipeline(e.target.value)} placeholder="Opportunités / TDR scannés..." />
              </div>
              <Button onClick={addMission}><Plus className="h-4 w-4 mr-2" />Ajouter Mission</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Missions ({missions.length})</CardTitle></CardHeader>
            <CardContent>
              {missions.length === 0 ? (
                <p className="text-muted-foreground text-sm">Aucune mission.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Mission</TableHead>
                      <TableHead>Consultants</TableHead>
                      <TableHead>TJM</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Pipeline</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {missions.map(m => (
                      <TableRow key={m.id}>
                        <TableCell className="font-mono">{m.project_code}</TableCell>
                        <TableCell>{m.mission_name}</TableCell>
                        <TableCell>{m.consultants}</TableCell>
                        <TableCell>{m.tjm}</TableCell>
                        <TableCell>
                          <Select value={m.status || "À faire"} onValueChange={v => updateMissionStatus(m.id, v)}>
                            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-xs text-muted-foreground">{m.pipeline}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => deleteMission(m.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </main>
    </div>
  );
}
