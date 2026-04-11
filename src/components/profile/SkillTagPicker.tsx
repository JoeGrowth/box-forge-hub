import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Settings, Search, Loader2, X } from "lucide-react";

interface SkillTag {
  id: string;
  name: string;
  category: string;
}

const MAX_SKILLS = 20;

export function SkillTagPicker() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [allTags, setAllTags] = useState<SkillTag[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [tagsRes, userSkillsRes] = await Promise.all([
        supabase.from("skill_tags").select("*").order("category").order("name"),
        supabase.from("user_skills").select("skill_tag_id").eq("user_id", user.id),
      ]);
      setAllTags((tagsRes.data as SkillTag[]) || []);
      const ids = new Set((userSkillsRes.data || []).map((r: any) => r.skill_tag_id));
      setSelectedIds(ids);
      setLoading(false);
    };
    load();
  }, [user]);

  const selectedTags = allTags.filter((t) => selectedIds.has(t.id));

  const toggleSkill = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= MAX_SKILLS) {
          toast({ title: "Limit reached", description: `Maximum ${MAX_SKILLS} skills allowed.`, variant: "destructive" });
          return prev;
        }
        next.add(id);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    // Delete all existing, insert new
    await supabase.from("user_skills").delete().eq("user_id", user.id);

    if (selectedIds.size > 0) {
      const rows = Array.from(selectedIds).map((skill_tag_id) => ({
        user_id: user.id,
        skill_tag_id,
      }));
      await supabase.from("user_skills").insert(rows);
    }

    setSaving(false);
    setIsEditing(false);
    toast({ title: "Skills saved", description: `${selectedIds.size} skills selected.` });
  };

  // Group tags by category for picker
  const grouped = allTags.reduce<Record<string, SkillTag[]>>((acc, tag) => {
    if (!acc[tag.category]) acc[tag.category] = [];
    acc[tag.category].push(tag);
    return acc;
  }, {});

  const filteredGrouped = Object.entries(grouped).reduce<Record<string, SkillTag[]>>((acc, [cat, tags]) => {
    const filtered = search ? tags.filter((t) => t.name.toLowerCase().includes(search.toLowerCase())) : tags;
    if (filtered.length > 0) acc[cat] = filtered;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="bg-card rounded-3xl border border-border p-8 mb-8">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Loading skills...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-3xl border border-border p-8 mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <Settings className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Skill Tags</h3>
            <p className="text-sm text-muted-foreground">
              {selectedIds.size}/{MAX_SKILLS} selected — used for opportunity matching
            </p>
          </div>
        </div>
        {!isEditing && (
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            Edit
          </Button>
        )}
      </div>

      {/* Display selected tags */}
      {!isEditing && (
        <div>
          {selectedTags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedTags.map((tag) => (
                <Badge key={tag.id} variant="secondary" className="bg-purple-500/10 text-purple-600 border-none">
                  {tag.name}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No skills selected. Click "Edit" to pick up to {MAX_SKILLS} skills.
            </p>
          )}
        </div>
      )}

      {/* Editor */}
      {isEditing && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Filter skills..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Selected preview */}
          {selectedIds.size > 0 && (
            <div className="flex flex-wrap gap-1.5 p-3 bg-muted/50 rounded-lg">
              {selectedTags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="default"
                  className="cursor-pointer gap-1"
                  onClick={() => toggleSkill(tag.id)}
                >
                  {tag.name}
                  <X className="w-3 h-3" />
                </Badge>
              ))}
            </div>
          )}

          {/* Grouped skill list */}
          <div className="max-h-64 overflow-y-auto space-y-4 border border-border rounded-lg p-3">
            {Object.entries(filteredGrouped).map(([category, tags]) => (
              <div key={category}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  {category}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => {
                    const selected = selectedIds.has(tag.id);
                    return (
                      <Badge
                        key={tag.id}
                        variant={selected ? "default" : "outline"}
                        className={`cursor-pointer transition-colors ${
                          selected ? "" : "hover:bg-muted"
                        }`}
                        onClick={() => toggleSkill(tag.id)}
                      >
                        {tag.name}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button variant="default" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Skills"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
