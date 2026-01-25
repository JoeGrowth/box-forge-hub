import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { UserWithDetails } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  RefreshCw, 
  Search, 
  User,
  Lightbulb,
  Users,
  Trash2,
  Archive,
  AlertTriangle,
  Mail,
  Loader2,
} from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

interface AdminUsersTabProps {
  users: UserWithDetails[];
  onRefresh: () => Promise<any>;
}

type StatusFilter = "all" | "joined" | "resume" | "boost" | "scale";
type DeleteType = "soft" | "hard";
type DeleteStep = "choose" | "confirm_code" | "processing";

export function AdminUsersTab({ users, onRefresh }: AdminUsersTabProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserWithDetails | null>(null);
  const [deleteType, setDeleteType] = useState<DeleteType>("soft");
  const [deleteStep, setDeleteStep] = useState<DeleteStep>("choose");
  const [confirmationCode, setConfirmationCode] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [testModeCode, setTestModeCode] = useState<string | null>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
    toast({ title: "Users refreshed" });
  };

  const getUserStatusLevel = (user: UserWithDetails): "joined" | "resume" | "boost" | "scale" => {
    const userStatus = user.onboarding?.user_status;
    if (userStatus === "scaled") return "scale";
    if (userStatus === "boosted") return "boost";
    if (userStatus === "approved") return "resume";
    return "joined";
  };

  const filteredUsers = users
    .filter((u) => {
      if (statusFilter === "all") return true;
      return getUserStatusLevel(u) === statusFilter;
    })
    .filter((u) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        u.profile?.full_name?.toLowerCase().includes(query) ||
        u.profile?.primary_skills?.toLowerCase().includes(query)
      );
    });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getVisionLabel = (user: UserWithDetails) => {
    const potentialRole = user.onboarding?.potential_role;
    if (potentialRole === "potential_entrepreneur") return "Initiator";
    if (potentialRole === "potential_co_builder") return "Co Builder";
    return "—";
  };

  const getStatusLabel = (user: UserWithDetails) => {
    const level = getUserStatusLevel(user);
    switch (level) {
      case "scale": return "Scale";
      case "boost": return "Boost";
      case "resume": return "Resume";
      default: return "Joined";
    }
  };

  const getStatusBadgeClass = (user: UserWithDetails) => {
    const level = getUserStatusLevel(user);
    switch (level) {
      case "scale": return "bg-purple-500/10 text-purple-600 border-purple-500/20";
      case "boost": return "bg-b4-teal/10 text-b4-teal border-b4-teal/20";
      case "resume": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  const getCertificationLabel = (user: UserWithDetails) => {
    const count = user.certificationCount;
    if (count === 0) return null;
    return `C${count}`;
  };

  const getScalingLabel = (user: UserWithDetails) => {
    const total = user.ideasAsInitiator + user.ideasAsCoBuilder + (user.hasConsultantScaling ? 1 : 0);
    if (total === 0) return null;
    return `S${total}`;
  };

  const openDeleteDialog = (user: UserWithDetails) => {
    setUserToDelete(user);
    setDeleteType("soft");
    setDeleteStep("choose");
    setConfirmationCode("");
    setTestModeCode(null);
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setUserToDelete(null);
    setDeleteType("soft");
    setDeleteStep("choose");
    setConfirmationCode("");
    setTestModeCode(null);
    setIsProcessing(false);
  };

  const handleSendConfirmationCode = async () => {
    if (!userToDelete) return;
    
    setIsProcessing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke("delete-account", {
        body: {
          action: "send_confirmation",
          isAdminAction: true,
          targetUserId: userToDelete.id,
        },
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to send confirmation code");
      }

      if (response.data?.testMode && response.data?.code) {
        setTestModeCode(response.data.code);
      }

      toast({
        title: "Confirmation code sent",
        description: response.data?.testMode 
          ? `Test mode: ${response.data.code}` 
          : "Check your email for the confirmation code",
      });
      setDeleteStep("confirm_code");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send confirmation code",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    setIsProcessing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      const body: any = {
        deleteType,
        isAdminAction: true,
        targetUserId: userToDelete.id,
      };

      if (deleteType === "hard") {
        body.confirmationCode = confirmationCode;
      }

      const response = await supabase.functions.invoke("delete-account", {
        body,
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to delete user");
      }

      toast({
        title: deleteType === "soft" ? "Account deactivated" : "Account deleted",
        description: deleteType === "soft" 
          ? `${userToDelete.profile?.full_name || "User"}'s account has been deactivated`
          : `${userToDelete.profile?.full_name || "User"}'s account has been permanently deleted`,
      });

      closeDeleteDialog();
      await onRefresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProceedWithDelete = () => {
    if (deleteType === "hard") {
      handleSendConfirmationCode();
    } else {
      handleDeleteUser();
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground py-1">Status:</span>
          {(["all", "joined", "resume", "boost", "scale"] as StatusFilter[]).map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(status)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>User Name</TableHead>
                <TableHead>Vision</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Boost</TableHead>
                <TableHead>Scaling</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => {
                  const statusLevel = getUserStatusLevel(user);
                  const showBoost = statusLevel === "boost" || statusLevel === "scale";
                  const showScaling = statusLevel === "scale";
                  const certLabel = getCertificationLabel(user);
                  const scalingLabel = getScalingLabel(user);
                  const visionLabel = getVisionLabel(user);

                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-b4-teal/20 to-b4-coral/20 flex items-center justify-center flex-shrink-0">
                            <User className="w-5 h-5 text-foreground" />
                          </div>
                          <span className="font-medium text-foreground">
                            {user.profile?.full_name || "Unnamed User"}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell>
                        {visionLabel !== "—" ? (
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                            visionLabel === "Initiator" 
                              ? "bg-b4-teal/10 text-b4-teal border-b4-teal/20"
                              : "bg-b4-coral/10 text-b4-coral border-b4-coral/20"
                          }`}>
                            {visionLabel === "Initiator" ? (
                              <Lightbulb className="w-3 h-3" />
                            ) : (
                              <Users className="w-3 h-3" />
                            )}
                            {visionLabel}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      <TableCell>
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border ${getStatusBadgeClass(user)}`}>
                          {getStatusLabel(user)}
                        </span>
                      </TableCell>

                      <TableCell>
                        {showBoost && certLabel ? (
                          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border bg-amber-500/10 text-amber-600 border-amber-500/20">
                            Boost {certLabel}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      <TableCell>
                        {showScaling && scalingLabel ? (
                          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border bg-purple-500/10 text-purple-600 border-purple-500/20">
                            {scalingLabel}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(user.created_at)}
                        </span>
                      </TableCell>

                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => openDeleteDialog(user)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Summary */}
      <div className="text-sm text-muted-foreground text-center">
        Showing {filteredUsers.length} of {users.length} users
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Delete User Account
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteStep === "choose" && (
                <>
                  Choose how to handle <strong>{userToDelete?.profile?.full_name || "this user"}</strong>'s account:
                </>
              )}
              {deleteStep === "confirm_code" && (
                <>
                  Enter the 6-digit confirmation code sent to your admin email to permanently delete this account.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {deleteStep === "choose" && (
            <div className="space-y-3 py-4">
              {/* Soft Delete Option */}
              <div
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  deleteType === "soft"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground"
                }`}
                onClick={() => setDeleteType("soft")}
              >
                <div className="flex items-start gap-3">
                  <Archive className="w-5 h-5 text-amber-500 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Deactivate Account</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                        Recommended
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Marks the account as deleted but preserves data. Can be recovered if needed.
                    </p>
                  </div>
                </div>
              </div>

              {/* Hard Delete Option */}
              <div
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  deleteType === "hard"
                    ? "border-destructive bg-destructive/5"
                    : "border-border hover:border-muted-foreground"
                }`}
                onClick={() => setDeleteType("hard")}
              >
                <div className="flex items-start gap-3">
                  <Trash2 className="w-5 h-5 text-destructive mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Permanent Delete</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
                        Cannot be undone
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Completely removes all user data. Requires email confirmation to your admin account.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {deleteStep === "confirm_code" && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span>Check your email for the code</span>
              </div>
              
              {testModeCode && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center">
                  <p className="text-xs text-amber-600 mb-1">Test Mode - Code:</p>
                  <p className="text-lg font-mono font-bold text-amber-700">{testModeCode}</p>
                </div>
              )}

              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={confirmationCode}
                  onChange={setConfirmationCode}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeDeleteDialog} disabled={isProcessing}>
              Cancel
            </AlertDialogCancel>
            
            {deleteStep === "choose" && deleteType === "soft" && (
              <AlertDialogAction
                onClick={handleProceedWithDelete}
                disabled={isProcessing}
              >
                {isProcessing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Deactivate Account
              </AlertDialogAction>
            )}

            {deleteStep === "choose" && deleteType === "hard" && (
              <Button
                onClick={handleProceedWithDelete}
                disabled={isProcessing}
                variant="destructive"
              >
                {isProcessing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Send Confirmation Code
              </Button>
            )}

            {deleteStep === "confirm_code" && (
              <Button
                onClick={handleDeleteUser}
                disabled={isProcessing || confirmationCode.length !== 6}
                variant="destructive"
              >
                {isProcessing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Permanently Delete
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
