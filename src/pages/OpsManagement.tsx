import { useEffect, useState } from "react";
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
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

type Consultant = { id: string; name: string; pattern: string };
type Shareholder = { name: string; share: string };
type Company = {
  id: string;
  name: string;
  legalForm: string;
  shareholders: Shareholder[];
};
type Client = { id: string; name: string };
type Offer = {
  id: string;
  clientId: string;
  companyId: string;
  consultantIds: string[];
  description: string;
  price: string;
};

const LEGAL_FORMS = ["SUARL", "SARL", "SA", "SAS", "Auto-entrepreneur", "Other"];

const uid = () => Math.random().toString(36).slice(2, 10);

function useLS<T>(key: string, initial: T) {
  const [val, setVal] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(val));
  }, [key, val]);
  return [val, setVal] as const;
}

export default function OpsManagement() {
  const [consultants, setConsultants] = useLS<Consultant[]>("ops:consultants", []);
  const [companies, setCompanies] = useLS<Company[]>("ops:companies", []);
  const [clients, setClients] = useLS<Client[]>("ops:clients", []);
  const [offers, setOffers] = useLS<Offer[]>("ops:offers", []);

  // Consultant form
  const [cName, setCName] = useState("");
  const [cPattern, setCPattern] = useState("");

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

  const addConsultant = () => {
    if (!cName.trim()) return toast.error("Name required");
    setConsultants([...consultants, { id: uid(), name: cName.trim(), pattern: cPattern.trim() }]);
    setCName(""); setCPattern("");
    toast.success("Consultant added");
  };

  const addCompany = () => {
    if (!coName.trim()) return toast.error("Company name required");
    const cleaned = shs.filter((s) => s.name.trim());
    setCompanies([...companies, { id: uid(), name: coName.trim(), legalForm: coLegal, shareholders: cleaned }]);
    setCoName(""); setCoLegal("SUARL"); setShs([{ name: "", share: "" }]);
    toast.success("Company added");
  };

  const addClient = () => {
    if (!clName.trim()) return toast.error("Client name required");
    setClients([...clients, { id: uid(), name: clName.trim() }]);
    setClName("");
    toast.success("Client added");
  };

  const addOffer = () => {
    if (!oClient || !oCompany || oConsultants.length === 0) {
      return toast.error("Select client, company and at least one consultant");
    }
    setOffers([
      ...offers,
      { id: uid(), clientId: oClient, companyId: oCompany, consultantIds: oConsultants, description: oDesc, price: oPrice },
    ]);
    setOClient(""); setOCompany(""); setOConsultants([]); setODesc(""); setOPrice("");
    toast.success("Offer added");
  };

  const toggleConsultantInOffer = (id: string) => {
    setOConsultants((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const nameOf = <T extends { id: string; name: string }>(arr: T[], id: string) =>
    arr.find((x) => x.id === id)?.name || "—";

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
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <Label>Name</Label>
              <Input value={cName} onChange={(e) => setCName(e.target.value)} placeholder="Full name" />
            </div>
            <div>
              <Label>Cognitive Pattern / NR</Label>
              <Input value={cPattern} onChange={(e) => setCPattern(e.target.value)} placeholder="e.g. Strategist" />
            </div>
            <div className="flex items-end">
              <Button onClick={addConsultant}>Add Consultant</Button>
            </div>
          </div>
          {consultants.length > 0 && (
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Pattern / NR</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {consultants.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.name}</TableCell>
                    <TableCell>{c.pattern || "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => setConsultants(consultants.filter((x) => x.id !== c.id))}>
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
                    <TableCell><Badge variant="outline">{c.legalForm}</Badge></TableCell>
                    <TableCell className="text-sm">
                      {c.shareholders.length > 0
                        ? c.shareholders.map((s) => `${s.name}${s.share ? ` (${s.share}%)` : ""}`).join(", ")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => setCompanies(companies.filter((x) => x.id !== c.id))}>
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
                      <Button variant="ghost" size="icon" onClick={() => setClients(clients.filter((x) => x.id !== c.id))}>
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
                    <TableCell>{nameOf(clients, o.clientId)}</TableCell>
                    <TableCell>{nameOf(companies, o.companyId)}</TableCell>
                    <TableCell className="text-sm">
                      {o.consultantIds.map((id) => nameOf(consultants, id)).join(", ")}
                    </TableCell>
                    <TableCell className="max-w-xs text-sm">{o.description || "—"}</TableCell>
                    <TableCell>{o.price || "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => setOffers(offers.filter((x) => x.id !== o.id))}>
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
