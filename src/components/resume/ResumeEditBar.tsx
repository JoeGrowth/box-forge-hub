import { Button } from "@/components/ui/button";
import { Loader2, Save, X } from "lucide-react";

type Props = {
  open: boolean;
  isSaving: boolean;
  onCancel: () => void;
  onSave: () => void;
};

export default function ResumeEditBar({
  open,
  isSaving,
  onCancel,
  onSave,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container max-w-5xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Editing mode — make your changes above
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onCancel} className="gap-2">
              <X className="w-4 h-4" />
              Cancel
            </Button>
            <Button variant="teal" onClick={onSave} disabled={isSaving} className="gap-2">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
