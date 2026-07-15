import { useState, useRef } from "react";
import { sanitizeError } from "@/lib/errorHandler";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Camera, X, Loader2, Bug } from "lucide-react";

const SEVERITIES = [
  { value: "low", label: "Low - Cosmetic" },
  { value: "medium", label: "Medium - Affects functionality" },
  { value: "high", label: "High - Blocks workflow" },
  { value: "critical", label: "Critical - Site unusable" },
];

const SUB_TASKS = [
  { value: "general", label: "General / Other" },
  { value: "onboarding", label: "Onboarding" },
  { value: "profile", label: "Profile" },
  { value: "projects", label: "Projects / Startups" },
  { value: "people", label: "People / Co-Builders" },
  { value: "opportunities", label: "Opportunities" },
  { value: "applications", label: "Applications" },
  { value: "chat", label: "Chat / Messages" },
  { value: "boxes", label: "Boxes" },
  { value: "learning", label: "Learning Journeys" },
  { value: "consulting", label: "Consulting" },
  { value: "career", label: "Career" },
  { value: "entrepreneurship", label: "Entrepreneurship" },
  { value: "technical_co_founder", label: "Technical Co-Founder" },
];

interface ReportBetaIssueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReportBetaIssueDialog({ open, onOpenChange }: ReportBetaIssueDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [location, setLocation] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [subTask, setSubTask] = useState("general");
  const [description, setDescription] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setLocation("");
    setSeverity("medium");
    setSubTask("general");
    setDescription("");
    setScreenshotFile(null);
    setScreenshotPreview(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum screenshot size is 5MB",
        variant: "destructive",
      });
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    setScreenshotFile(file);
    setScreenshotPreview(URL.createObjectURL(file));
  };

  const clearScreenshot = () => {
    setScreenshotFile(null);
    if (screenshotPreview) {
      URL.revokeObjectURL(screenshotPreview);
    }
    setScreenshotPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to report a beta issue.",
        variant: "destructive",
      });
      return;
    }

    if (!location.trim() || !description.trim()) {
      toast({
        title: "Missing fields",
        description: "Please fill in where you found the issue and a description.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      let screenshotUrl: string | null = null;
      let screenshotPath: string | null = null;

      if (screenshotFile) {
        const fileExt = screenshotFile.name.split(".").pop() || "png";
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("bug-screenshots")
          .upload(path, screenshotFile);

        if (uploadError) throw uploadError;

        const { data: signed, error: signedError } = await supabase.storage
          .from("bug-screenshots")
          .createSignedUrl(path, 60 * 60 * 24 * 365);

        if (signedError || !signed?.signedUrl) throw signedError ?? new Error("Failed to sign URL");

        screenshotUrl = signed.signedUrl;
        screenshotPath = path;
      }

      const { error: insertError } = await supabase.from("beta_bug_reports" as any).insert({
        reporter_id: user.id,
        location: location.trim(),
        severity,
        sub_task: subTask,
        description: description.trim(),
        screenshot_url: screenshotUrl,
        screenshot_path: screenshotPath,
      });

      if (insertError) throw insertError;

      toast({
        title: "Issue reported",
        description: "Thank you for helping improve the platform.",
      });

      resetForm();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Beta report error:", error);
      toast({
        title: "Failed to submit report",
        description: sanitizeError(error) || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Bug className="w-5 h-5 text-b4-coral" />
            <DialogTitle>Report Beta Testing Issue</DialogTitle>
          </div>
          <DialogDescription>
            Reporting beta testing errors helps us improve the platform. Attach a screenshot if possible.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="issue-location">Where did you find this issue?</Label>
              <Input
                id="issue-location"
                placeholder="e.g. Home, Projects page"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={submitting}
              />
            </div>

            <div className="space-y-2">
              <Label>Severity</Label>
              <Select value={severity} onValueChange={setSeverity} disabled={submitting}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITIES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Related Project Sub-Task</Label>
            <Select value={subTask} onValueChange={setSubTask} disabled={submitting}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUB_TASKS.map((task) => (
                  <SelectItem key={task.value} value={task.value}>
                    {task.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="issue-description">Describe the issue</Label>
            <Textarea
              id="issue-description"
              placeholder="Please describe what happened and the steps to reproduce the issue..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={submitting}
              rows={5}
              className="resize-y"
            />
          </div>

          <div className="space-y-2">
            <Label>Attach Screenshots</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={submitting}
            />

            {screenshotPreview ? (
              <div className="relative inline-block">
                <img
                  src={screenshotPreview}
                  alt="Screenshot preview"
                  className="max-h-40 rounded-lg border border-border object-cover"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6"
                  onClick={clearScreenshot}
                  disabled={submitting}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={submitting}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Files
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={submitting}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Capture Screen
                </Button>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Report"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
