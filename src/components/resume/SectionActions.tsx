import { Button } from "@/components/ui/button";
import { Edit2, History, Plus } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Props = {
  hasContent: boolean;
  isEditing: boolean;
  showHistory: boolean;
  onEdit: () => void;
  onToggleHistory: () => void;
  onAdd: () => void;
};

export default function SectionActions({
  hasContent,
  isEditing,
  showHistory,
  onEdit,
  onToggleHistory,
  onAdd,
}: Props) {
  if (isEditing) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-1">
        {hasContent ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onEdit}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit</TooltipContent>
          </Tooltip>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
                onClick={onAdd}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add Experience</TooltipContent>
          </Tooltip>
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={showHistory ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={onToggleHistory}
            >
              <History className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>View History</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
