import { Button } from "@/components/ui/button";
import { Loader2, Save, X } from "lucide-react";

type Props = {
  open: boolean;
  isSaving: boolean;
  canSave: boolean;
  onCancel: () => void;
  onSave: () => void;
  onScrollToChangeNotes: () => void;
};

export default function ResumeEditBar({
  open,
  isSaving,
  canSave,
  onCancel,
  onSave,
  onScrollToChangeNotes,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container max-w-5xl mx-auto px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            {canSave ? (
              "Ready to save your updates."
            ) : (
              <span>
                Add <button className="underline underline-offset-4" onClick={onScrollToChangeNotes}>Change Notes</button> to enable saving.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 justify-end">
            <Button variant="outline" onClick={onCancel} className="gap-2">
              <X className="w-4 h-4" />
              Cancel
            </Button>
            <Button variant="teal" onClick={onSave} disabled={isSaving || !canSave} className="gap-2">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
