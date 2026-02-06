import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { UserWithDetails } from "@/hooks/useAdmin";
import {
  User,
  Lightbulb,
  Users,
  Award,
  Briefcase,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Rocket,
} from "lucide-react";

interface AdminUserPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserWithDetails | null;
}

export function AdminUserPreviewDialog({
  open,
  onOpenChange,
  user,
}: AdminUserPreviewDialogProps) {
  if (!user) return null;

  const getUserStatusLevel = (): string => {
    const userStatus = user.onboarding?.user_status;
    if (userStatus === "scaled") return "Scale";
    if (userStatus === "boosted") return "Boost";
    if (userStatus === "approved") return "Resume";
    return "Joined";
  };

  const getStatusColor = (): string => {
    const level = getUserStatusLevel();
    switch (level) {
      case "Scale": return "bg-purple-500/10 text-purple-600 border-purple-500/20";
      case "Boost": return "bg-b4-teal/10 text-b4-teal border-b4-teal/20";
      case "Resume": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  const getVisionLabel = () => {
    const potentialRole = user.onboarding?.potential_role;
    if (potentialRole === "potential_entrepreneur") return "Initiator";
    if (potentialRole === "potential_co_builder") return "Co Builder";
    return "Not Set";
  };

  const getJourneyStatusLabel = () => {
    const status = user.onboarding?.journey_status;
    switch (status) {
      case "approved": return { label: "Approved", color: "bg-green-500/10 text-green-600 border-green-500/20" };
      case "entrepreneur_approved": return { label: "Entrepreneur Approved", color: "bg-green-500/10 text-green-600 border-green-500/20" };
      case "pending_approval": return { label: "Pending Approval", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" };
      case "rejected": return { label: "Rejected", color: "bg-destructive/10 text-destructive border-destructive/20" };
      default: return { label: status || "Not Started", color: "bg-muted text-muted-foreground border-border" };
    }
  };

  const journeyStatus = getJourneyStatusLabel();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-b4-teal/20 to-b4-coral/20 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <span className="text-lg">{user.profile?.full_name || "Unnamed User"}</span>
              <p className="text-sm text-muted-foreground font-normal">{user.email}</p>
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">
            User platform overview
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Status Overview */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Platform Status
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Current Level</span>
                  <div>
                    <Badge variant="outline" className={getStatusColor()}>
                      {getUserStatusLevel()}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Journey Status</span>
                  <div>
                    <Badge variant="outline" className={journeyStatus.color}>
                      {journeyStatus.label}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Vision</span>
                  <div className="flex items-center gap-1.5">
                    {getVisionLabel() === "Initiator" ? (
                      <Lightbulb className="w-3.5 h-3.5 text-b4-teal" />
                    ) : getVisionLabel() === "Co Builder" ? (
                      <Users className="w-3.5 h-3.5 text-b4-coral" />
                    ) : null}
                    <span className="text-sm font-medium">{getVisionLabel()}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Joined</span>
                  <span className="text-sm font-medium block">{formatDate(user.created_at)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Onboarding Details */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Rocket className="w-4 h-4" />
                Onboarding
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Completed</span>
                  <div className="flex items-center gap-1.5">
                    {user.onboarding?.onboarding_completed ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="text-sm">{user.onboarding?.onboarding_completed ? "Yes" : "No"}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Current Step</span>
                  <span className="text-sm font-medium block">Step {user.onboarding?.current_step || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Natural Role */}
          {user.naturalRole && (
            <Card>
              <CardContent className="pt-4 space-y-3">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  Natural Role
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Status</span>
                    <span className="text-sm font-medium block capitalize">{user.naturalRole.status || "—"}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Ready</span>
                    <div className="flex items-center gap-1.5">
                      {user.naturalRole.is_ready ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <Clock className="w-4 h-4 text-amber-500" />
                      )}
                      <span className="text-sm">{user.naturalRole.is_ready ? "Yes" : "Not yet"}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Wants to Scale</span>
                    <span className="text-sm font-medium block">{user.naturalRole.wants_to_scale ? "Yes" : "No"}</span>
                  </div>
                </div>
                {user.naturalRole.description && (
                  <div className="space-y-1 pt-1">
                    <span className="text-xs text-muted-foreground">Description</span>
                    <p className="text-sm text-foreground bg-muted/50 p-2 rounded-md line-clamp-3">
                      {user.naturalRole.description}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Achievements */}
          <Card>
            <CardContent className="pt-4 space-y-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Award className="w-4 h-4" />
                Achievements
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <span className="text-2xl font-bold text-foreground">{user.certificationCount}</span>
                  <p className="text-xs text-muted-foreground mt-1">Certifications</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <span className="text-2xl font-bold text-foreground">{user.ideasAsInitiator}</span>
                  <p className="text-xs text-muted-foreground mt-1">As Initiator</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <span className="text-2xl font-bold text-foreground">{user.ideasAsCoBuilder}</span>
                  <p className="text-xs text-muted-foreground mt-1">As Co-Builder</p>
                </div>
              </div>
              {user.hasConsultantScaling && (
                <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20">
                  Consultant Scaling Active
                </Badge>
              )}
            </CardContent>
          </Card>

          {/* Profile Details */}
          {user.profile?.primary_skills && (
            <Card>
              <CardContent className="pt-4 space-y-2">
                <span className="text-xs text-muted-foreground">Primary Skills</span>
                <p className="text-sm text-foreground">{user.profile.primary_skills}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}