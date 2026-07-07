import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "organization-logos";
const cache = new Map<string, string>();

interface Props {
  path: string | null | undefined;
  alt?: string;
  className?: string;
  iconClassName?: string;
}

/**
 * Renders an org logo from the private `organization-logos` bucket via signed URL,
 * falling back to a Building2 icon when no logo is set.
 */
export function OrgLogo({ path, alt = "Organization logo", className = "", iconClassName = "" }: Props) {
  const [url, setUrl] = useState<string | null>(path ? cache.get(path) ?? null : null);

  useEffect(() => {
    let cancelled = false;
    if (!path) { setUrl(null); return; }
    if (cache.has(path)) { setUrl(cache.get(path)!); return; }
    (async () => {
      const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24 * 7);
      if (!cancelled && data?.signedUrl) {
        cache.set(path, data.signedUrl);
        setUrl(data.signedUrl);
      }
    })();
    return () => { cancelled = true; };
  }, [path]);

  if (url) {
    return <img src={url} alt={alt} className={className} />;
  }
  return <Building2 className={iconClassName} />;
}

export function invalidateOrgLogo(path: string | null | undefined) {
  if (path) cache.delete(path);
}
