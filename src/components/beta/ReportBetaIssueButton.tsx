import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ReportBetaIssueDialog } from "./ReportBetaIssueDialog";
import { Bug } from "lucide-react";

interface ReportBetaIssueButtonProps {
  variant?: "floating" | "inline";
}

export function ReportBetaIssueButton({ variant = "floating" }: ReportBetaIssueButtonProps) {
  const [open, setOpen] = useState(false);

  if (variant === "inline") {
    return (
      <>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Bug className="w-4 h-4 mr-2" />
          Report Beta Issue
        </Button>
        <ReportBetaIssueDialog open={open} onOpenChange={setOpen} />
      </>
    );
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 rounded-full shadow-lg gap-2 px-4 py-6"
        size="lg"
      >
        <Bug className="w-5 h-5" />
        <span className="hidden sm:inline">Report Beta Issue</span>
      </Button>
      <ReportBetaIssueDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
