import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { MissionProduct } from "@/hooks/useMissionProducts";

export function MissionProductSelect({ products, value, onSelect, loading, error, id }: {
  products: MissionProduct[];
  value: string;
  onSelect: (product: MissionProduct) => void;
  loading: boolean;
  error: boolean;
  id?: string;
}) {
  return <>
    <Select value={value} disabled={loading || error || !products.length} onValueChange={(id) => {
      const product = products.find((p) => p.id === id);
      if (product) onSelect(product);
    }}>
      <SelectTrigger id={id} aria-label="Mission title"><SelectValue placeholder={loading ? "Loading products…" : "Select organization product"} /></SelectTrigger>
      <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} · {p.shippedCount} shipped</SelectItem>)}</SelectContent>
    </Select>
    {error ? <p className="text-xs text-destructive">Products could not be loaded. Reload to retry.</p> : !loading && !products.length ? <p className="text-xs text-muted-foreground">No shipped products available.</p> : null}
  </>;
}