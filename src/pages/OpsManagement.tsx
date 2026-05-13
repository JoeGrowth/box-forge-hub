import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Consultant = { id: string; name: string; pattern: string; skills: string[] };
type Shareholder = { name: string; share: string };
type Company = { id: string; name: string; legal_form: string; shareholders: Shareholder[] };
type Client = { id: string; name: string };
type Offer = {
  id: string;
  client_id: string;
  company_id: string;
  consultant_ids: string[];
  description: string;
  price: string;
};

const LEGAL_FORMS = ["SUARL", "SARL", "SA", "SAS", "Auto-entrepreneur", "Other"];

export default function OpsManagement() {
  const { user } = useAuth();

  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  // Consultant form
  const [cName, setCName] = useState("");
  const [cPattern, setCPattern] = useState("");
  const [cSkills, setCSkills] = useState<string[]>(["", "", ""]);

  // Company form
  const [coName, setCoName] = useState("");
  const [coLegal, setCoLegal] = useState("SUARL");
  const [shs, setShs] = useState<Shareholder[]>([{ name: "", share: "" }]);

  // Client form
  const [clName, setClName] = useState("");

  // Offer form
  const [oClient, setOClient] = useState("");
  const [oCompany, setOCompany] = useState("");
  const [oConsultants, setOConsultants] = useState<string[]>([]);
  const [oDesc, setODesc] = useState("");
  const [oPrice, setOPrice] = useState("");

  const fetchAll = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [
        { data: cData, error: cErr },
        { data: coData, error: coErr },
        { data: clData, error: clErr },
        { data: oData, error: oErr },
      ] = await Promise.all([
        supabase.from("ops_consultants").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("ops_companies").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("ops_clients").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("ops_offers").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      ]);
      if (cErr) console.error("Consultants fetch error:", cErr);
      if (coErr) console.error("Companies fetch error:", coErr);
      if (clErr) console.error("Clients fetch error:", clErr);
      if (oErr) console.error("Offers fetch error:", oErr);
      setConsultants((cData as Consultant[]) || []);
      setCompanies(
        (coData || []).map((x: any) => ({
          ...x,
          shareholders: Array.isArray(x.shareholders) ? x.shareholders : [],
        })) as Company[]
      );
      setClients((clData as Client[]) || []);
      setOffers((oData as Offer[]) || []);
    } catch (err) {
      console.error("fetchAll error:", err);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const addConsultant = async () => {
    if (!user) return toast.error("Not authenticated");
    if (!cName.trim()) return toast.error("Name required");
    const skills = cSkills.map((s) => s.trim()).filter(Boolean).slice(0, 3);
    const { error } = await supabase.from("ops_consultants").insert({
      user_id: user.id,
      name: cName.trim(),
      pattern: cPattern.trim(),
      skills,
    });
    if (error) return toast.error("Failed to add consultant");
    setCName(""); setCPattern(""); setCSkills(["", "", ""]);
    toast.success("Consultant added");
    fetchAll();
  };

  const addCompany = async () => {
    if (!user) return toast.error("Not authenticated");
    if (!coName.trim()) return toast.error("Company name required");
    const cleaned = shs.filter((s) => s.name.trim());
    const { error } = await supabase.from("ops_companies").insert({
      user_id: user.id,
      name: coName.trim(),
      legal_form: coLegal,
      shareholders: cleaned,
    });
    if (error) return toast.error("Failed to add company");
    setCoName(""); setCoLegal("SUARL"); setShs([{ name: "", share: "" }]);
    toast.success("Company added");
    fetchAll();
  };

  const addClient = async () => {
    if (!user) return toast.error("Not authenticated");
    if (!clName.trim()) return toast.error("Client name required");
    const { error } = await supabase.from("ops_clients").insert({
      user_id: user.id,
      name: clName.trim(),
    });
    if (error) return toast.error("Failed to add client");
    setClName("");
    toast.success("Client added");
    fetchAll();
  };

  const addOffer = async () => {
    if (!user) return toast.error("Not authenticated");
    if (!oClient || !oCompany || oConsultants.length === 0) {
      return toast.error("Select client, company and at least one consultant");
    }
    const { error } = await supabase.from("ops_offers").insert({
      user_id: user.id,
      client_id: oClient,
      company_id: oCompany,
      consultant_ids: oConsultants,
      description: oDesc,
      price: oPrice,
    });
    if (error) return toast.error("Failed to add offer");
    setOClient(""); setOCompany(""); setOConsultants([]); setODesc(""); setOPrice("");
    toast.success("Offer added");
    fetchAll();
  };

  const deleteConsultant = async (id: string) => {
    const { error } = await supabase.from("ops_consultants").delete().eq("id", id);
    if (error) return toast.error("Delete failed");
    fetchAll();
  };

  const deleteCompany = async (id: string) => {
    const { error } = await supabase.from("ops_companies").delete().eq("id", id);
    if (error) return toast.error("Delete failed");
    fetchAll();
  };

  const deleteClient = async (id: string) => {
    const { error } = await supabase.from("ops_clients").delete().eq("id", id);
    if (error) return toast.error("Delete failed");
    fetchAll();
  };

  const deleteOffer = async (id: string) => {
    const { error } = await supabase.from("ops_offers").delete().eq("id", id);
    if (error) return toast.error("Delete failed");
    fetchAll();
  };

  const toggleConsultantInOffer = (id: string) => {
    setOConsultants((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const nameOf = <T extends { id: string; name: string }>(arr: T[], id: string) =>
    arr.find((x) => x.id === id)?.name || "—";

  if (loading) {
    return (
      <div className="container mx-auto max-w-6xl py-8 flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto max-w-6xl py-8 text-center min-h-[40vh] flex flex-col items-center justify-center">
        <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
        <p className="text-muted-foreground mb-4">Please log in to access Ops Management.</p>
        <Button onClick={() => window.location.href = "/auth"}>Go to Login</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl py-8 space-y-8">
      <header>
        <h1 className="text-3xl font-bold">Ops Management</h1>
        <p className="text-muted-foreground">Consultants, companies, clients, and offers.</p>
      </header>

      {/* Consultants */}
      <Card>
        <CardHeader><CardTitle>Add Consultant</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>Name</Label>
              <Input value={cName} onChange={(e) => setCName(e.target.value)} placeholder="Full name" />
            </div>
            <div>
              <Label>Cognitive Pattern / NR</Label>
              <Input value={cPattern} onChange={(e) => setCPattern(e.target.value)} placeholder="e.g. Strategist" />
            </div>
          </div>
          <div>
            <Label>Main Skills (max 3 — skills, not techniques)</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Enter skills (e.g. "Workshop Facilitation", "Process Analysis"). Avoid techniques like "Process Mapping".
            </p>
            <div className="grid md:grid-cols-3 gap-2">
              {cSkills.map((s, i) => (
                <Input
                  key={i}
                  value={s}
                  onChange={(e) => setCSkills(cSkills.map((x, idx) => (idx === i ? e.target.value : x)))}
                  placeholder={`Skill ${i + 1}`}
                />
              ))}
            </div>
          </div>
          <Button onClick={addConsultant}>Add Consultant</Button>
          {consultants.length > 0 && (
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Pattern / NR</TableHead><TableHead>Main Skills</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {consultants.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.name}</TableCell>
                    <TableCell>{c.pattern || "—"}</TableCell>
                    <TableCell className="text-sm">
                      {c.skills && c.skills.length > 0
                        ? c.skills.map((s, i) => <Badge key={i} variant="secondary" className="mr-1">{s}</Badge>)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => deleteConsultant(c.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Companies */}
      <Card>
        <CardHeader><CardTitle>Add Company</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>Company Name</Label>
              <Input value={coName} onChange={(e) => setCoName(e.target.value)} />
            </div>
            <div>
              <Label>Legal Form</Label>
              <Select value={coLegal} onValueChange={setCoLegal}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEGAL_FORMS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          {(coLegal === "SUARL" || coLegal === "SARL") && (
            <div className="space-y-2">
              <Label>Shareholders</Label>
              {shs.map((s, i) => (
                <div key={i} className="grid grid-cols-[1fr_120px_auto] gap-2">
                  <Input
                    placeholder="Shareholder name"
                    value={s.name}
                    onChange={(e) => setShs(shs.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x))}
                  />
                  <Input
                    placeholder="% share"
                    value={s.share}
                    onChange={(e) => setShs(shs.map((x, idx) => idx === i ? { ...x, share: e.target.value } : x))}
                  />
                  <Button variant="ghost" size="icon" onClick={() => setShs(shs.filter((_, idx) => idx !== i))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setShs([...shs, { name: "", share: "" }])}>
                + Add shareholder
              </Button>
            </div>
          )}
          <Button onClick={addCompany}>Add Company</Button>

          {companies.length > 0 && (
            <Table>
              <TableHeader><TableRow><TableHead>Company</TableHead><TableHead>Legal Form</TableHead><TableHead>Shareholders</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {companies.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.name}</TableCell>
                    <TableCell><Badge variant="outline">{c.legal_form}</Badge></TableCell>
                    <TableCell className="text-sm">
                      {c.shareholders.length > 0
                        ? c.shareholders.map((s) => `${s.name}${s.share ? ` (${s.share}%)` : ""}`).join(", ")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => deleteCompany(c.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Clients */}
      <Card>
        <CardHeader><CardTitle>Add Client</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Input value={clName} onChange={(e) => setClName(e.target.value)} placeholder="Client name" />
            <Button onClick={addClient}>Add Client</Button>
          </div>
          {clients.length > 0 && (
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {clients.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.name}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => deleteClient(c.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Offers */}
      <Card>
        <CardHeader><CardTitle>Add Offer</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>Client</Label>
              <Select value={oClient} onValueChange={setOClient}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Company</Label>
              <Select value={oCompany} onValueChange={setOCompany}>
                <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                <SelectContent>
                  {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Consultants</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {consultants.length === 0 && <p className="text-sm text-muted-foreground">Add consultants first.</p>}
              {consultants.map((c) => {
                const sel = oConsultants.includes(c.id);
                return (
                  <Button
                    key={c.id}
                    type="button"
                    variant={sel ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleConsultantInOffer(c.id)}
                  >
                    {c.name}
                  </Button>
                );
              })}
            </div>
          </div>
          <div>
            <Label>Offer Description</Label>
            <Textarea value={oDesc} onChange={(e) => setODesc(e.target.value)} />
          </div>
          <div>
            <Label>Offer Price</Label>
            <Input value={oPrice} onChange={(e) => setOPrice(e.target.value)} placeholder="e.g. 15000 TND" />
          </div>
          <Button onClick={addOffer}>Add Offer</Button>

          {offers.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Consultants</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {offers.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>{nameOf(clients, o.client_id)}</TableCell>
                    <TableCell>{nameOf(companies, o.company_id)}</TableCell>
                    <TableCell className="text-sm">
                      {o.consultant_ids.map((id) => nameOf(consultants, id)).join(", ")}
                    </TableCell>
                    <TableCell className="max-w-xs text-sm">{o.description || "—"}</TableCell>
                    <TableCell>{o.price || "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => deleteOffer(o.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
