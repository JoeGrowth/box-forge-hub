import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Edit2, Save, X, AlertCircle } from "lucide-react";
import { NaturalRole } from "@/hooks/useOnboarding";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface OnboardingAnswersCardProps {
  naturalRole: NaturalRole;
  onUpdate: () => void;
}

export const OnboardingAnswersCard = ({ naturalRole, onUpdate }: OnboardingAnswersCardProps) => {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState({
    description: naturalRole.description || "",
    practice_entities: naturalRole.practice_entities || "",
    training_contexts: naturalRole.training_contexts || "",
    consulting_with_whom: naturalRole.consulting_with_whom || "",
    consulting_case_studies: naturalRole.consulting_case_studies || "",
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("natural_roles")
        .update(editData)
        .eq("user_id", naturalRole.user_id);

      if (error) throw error;

      toast({
        title: "Changes saved",
        description: "Your answers have been updated successfully.",
      });
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const StatusBadge = ({ checked }: { checked: boolean | null }) => (
    checked ? (
      <Badge variant="default" className="bg-b4-teal text-white">
        <CheckCircle className="w-3 h-3 mr-1" /> Complete
      </Badge>
    ) : (
      <Badge variant="secondary">
        <AlertCircle className="w-3 h-3 mr-1" /> Incomplete
      </Badge>
    )
  );

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">Your Journey Answers</CardTitle>
        {!isEditing ? (
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            <Edit2 className="w-4 h-4 mr-2" />
            Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} disabled={isSaving}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button variant="teal" size="sm" onClick={handleSave} disabled={isSaving}>
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Natural Role Description */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Natural Role Description</Label>
          </div>
          {isEditing ? (
            <Textarea
              value={editData.description}
              onChange={(e) => setEditData({ ...editData, description: e.target.value })}
              placeholder="Your natural role description..."
              rows={3}
            />
          ) : (
            <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
              {naturalRole.description || "Not provided"}
            </p>
          )}
        </div>

        {/* Assessment Status */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Promise</p>
            <StatusBadge checked={naturalRole.promise_check} />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Practice</p>
            <StatusBadge checked={naturalRole.practice_check} />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Training</p>
            <StatusBadge checked={naturalRole.training_check} />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Consulting</p>
            <StatusBadge checked={naturalRole.consulting_check} />
          </div>
        </div>

        {/* Practice Details */}
        {naturalRole.practice_check && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Practice Experience</Label>
            {isEditing ? (
              <Textarea
                value={editData.practice_entities}
                onChange={(e) => setEditData({ ...editData, practice_entities: e.target.value })}
                placeholder="Your practice experience..."
                rows={3}
              />
            ) : (
              <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                {naturalRole.practice_entities || "Not provided"}
              </p>
            )}
            {naturalRole.practice_case_studies && (
              <p className="text-xs text-muted-foreground">
                Case studies: {naturalRole.practice_case_studies}
              </p>
            )}
          </div>
        )}

        {/* Training Details */}
        {naturalRole.training_check && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Training Experience</Label>
            {isEditing ? (
              <Textarea
                value={editData.training_contexts}
                onChange={(e) => setEditData({ ...editData, training_contexts: e.target.value })}
                placeholder="Your training contexts..."
                rows={2}
              />
            ) : (
              <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                {naturalRole.training_contexts || "Not provided"}
              </p>
            )}
            {naturalRole.training_count && (
              <p className="text-xs text-muted-foreground">
                Training count: {naturalRole.training_count}
              </p>
            )}
          </div>
        )}

        {/* Consulting Details */}
        {naturalRole.consulting_check && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Consulting Experience</Label>
            {isEditing ? (
              <>
                <Textarea
                  value={editData.consulting_with_whom}
                  onChange={(e) => setEditData({ ...editData, consulting_with_whom: e.target.value })}
                  placeholder="Who you consulted with..."
                  rows={2}
                />
                <Textarea
                  value={editData.consulting_case_studies}
                  onChange={(e) => setEditData({ ...editData, consulting_case_studies: e.target.value })}
                  placeholder="Case studies..."
                  rows={3}
                  className="mt-2"
                />
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                  <strong>With whom:</strong> {naturalRole.consulting_with_whom || "Not provided"}
                </p>
                <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3 mt-2">
                  <strong>Case studies:</strong> {naturalRole.consulting_case_studies || "Not provided"}
                </p>
              </>
            )}
          </div>
        )}

        {/* Scaling Interest */}
        <div className="pt-4 border-t border-border/50">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Interested in Scaling</span>
            <Badge variant={naturalRole.wants_to_scale ? "default" : "secondary"}>
              {naturalRole.wants_to_scale ? "Yes" : "No"}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
