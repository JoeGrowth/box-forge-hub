import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
  X,
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
  
  // Bulk selection state
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  
  // Delete dialog state (works for both single and bulk)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserWithDetails | null>(null);
  const [usersToDelete, setUsersToDelete] = useState<UserWithDetails[]>([]);
  const [isBulkDelete, setIsBulkDelete] = useState(false);
  const [deleteType, setDeleteType] = useState<DeleteType>("soft");
  const [deleteStep, setDeleteStep] = useState<DeleteStep>("choose");
  const [confirmationCode, setConfirmationCode] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [testModeCode, setTestModeCode] = useState<string | null>(null);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });

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

  // Selection handlers
  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedUserIds.size === filteredUsers.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(filteredUsers.map(u => u.id)));
    }
  };

  const clearSelection = () => {
    setSelectedUserIds(new Set());
  };

  // Single user delete
  const openDeleteDialog = (user: UserWithDetails) => {
    setUserToDelete(user);
    setUsersToDelete([]);
    setIsBulkDelete(false);
    setDeleteType("soft");
    setDeleteStep("choose");
    setConfirmationCode("");
    setTestModeCode(null);
    setBulkProgress({ current: 0, total: 0 });
    setDeleteDialogOpen(true);
  };

  // Bulk delete
  const openBulkDeleteDialog = () => {
    const selectedUsers = filteredUsers.filter(u => selectedUserIds.has(u.id));
    if (selectedUsers.length === 0) return;
    
    setUserToDelete(null);
    setUsersToDelete(selectedUsers);
    setIsBulkDelete(true);
    setDeleteType("soft");
    setDeleteStep("choose");
    setConfirmationCode("");
    setTestModeCode(null);
    setBulkProgress({ current: 0, total: selectedUsers.length });
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setUserToDelete(null);
    setUsersToDelete([]);
    setIsBulkDelete(false);
    setDeleteType("soft");
    setDeleteStep("choose");
    setConfirmationCode("");
    setTestModeCode(null);
    setIsProcessing(false);
    setBulkProgress({ current: 0, total: 0 });
  };

  const handleSendConfirmationCode = async () => {
    // For bulk delete, we just need to send one code (use first user as reference)
    const targetUser = isBulkDelete ? usersToDelete[0] : userToDelete;
    if (!targetUser) return;
    
    setIsProcessing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke("delete-account", {
        body: {
          action: "send_confirmation",
          isAdminAction: true,
          targetUserId: targetUser.id,
          isBulkAction: isBulkDelete,
          bulkUserCount: isBulkDelete ? usersToDelete.length : undefined,
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
    if (isBulkDelete) {
      await handleBulkDelete();
    } else {
      await handleSingleDelete();
    }
  };

  const handleSingleDelete = async () => {
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

  const handleBulkDelete = async () => {
    if (usersToDelete.length === 0) return;
    
    setIsProcessing(true);
    setBulkProgress({ current: 0, total: usersToDelete.length });
    
    const { data: sessionData } = await supabase.auth.getSession();
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < usersToDelete.length; i++) {
      const user = usersToDelete[i];
      setBulkProgress({ current: i + 1, total: usersToDelete.length });
      
      try {
        const body: any = {
          deleteType,
          isAdminAction: true,
          targetUserId: user.id,
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
          failCount++;
        } else {
          successCount++;
        }
      } catch {
        failCount++;
      }
    }

    const actionText = deleteType === "soft" ? "deactivated" : "deleted";
    
    if (failCount === 0) {
      toast({
        title: `All accounts ${actionText}`,
        description: `Successfully ${actionText} ${successCount} user(s)`,
      });
    } else {
      toast({
        title: `Bulk ${deleteType === "soft" ? "deactivation" : "deletion"} completed`,
        description: `${successCount} succeeded, ${failCount} failed`,
        variant: failCount > 0 ? "destructive" : "default",
      });
    }

    setSelectedUserIds(new Set());
    closeDeleteDialog();
    await onRefresh();
  };

  const handleProceedWithDelete = () => {
    if (deleteType === "hard") {
      handleSendConfirmationCode();
    } else {
      handleDeleteUser();
    }
  };

  const getDeleteDialogTitle = () => {
    if (isBulkDelete) {
      return `Delete ${usersToDelete.length} User Account${usersToDelete.length > 1 ? 's' : ''}`;
    }
    return "Delete User Account";
  };

  const getDeleteDialogDescription = () => {
    if (deleteStep === "choose") {
      if (isBulkDelete) {
        return (
          <>
            Choose how to handle <strong>{usersToDelete.length} selected user{usersToDelete.length > 1 ? 's' : ''}</strong>:
          </>
        );
      }
      return (
        <>
          Choose how to handle <strong>{userToDelete?.profile?.full_name || "this user"}</strong>'s account:
        </>
      );
    }
    if (deleteStep === "confirm_code") {
      if (isBulkDelete) {
        return (
          <>
            Enter the 6-digit confirmation code sent to your admin email to permanently delete {usersToDelete.length} account{usersToDelete.length > 1 ? 's' : ''}.
          </>
        );
      }
      return (
        <>
          Enter the 6-digit confirmation code sent to your admin email to permanently delete this account.
        </>
      );
    }
    return null;
  };

  const isAllSelected = filteredUsers.length > 0 && selectedUserIds.size === filteredUsers.length;
  const isSomeSelected = selectedUserIds.size > 0 && selectedUserIds.size < filteredUsers.length;

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
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all users"
                    className={isSomeSelected ? "data-[state=checked]:bg-primary/50" : ""}
                  />
                </TableHead>
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
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
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
                  const isSelected = selectedUserIds.has(user.id);

                  return (
                    <TableRow key={user.id} className={isSelected ? "bg-primary/5" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleUserSelection(user.id)}
                          aria-label={`Select ${user.profile?.full_name || "user"}`}
                        />
                      </TableCell>
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

      {/* Floating Bulk Action Bar */}
      {selectedUserIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-4 bg-card border border-border rounded-full px-6 py-3 shadow-xl">
            <span className="text-sm font-medium">
              {selectedUserIds.size} user{selectedUserIds.size > 1 ? 's' : ''} selected
            </span>
            <div className="h-4 w-px bg-border" />
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              className="gap-1"
            >
              <X className="w-4 h-4" />
              Clear
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={openBulkDeleteDialog}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete Selected
            </Button>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              {getDeleteDialogTitle()}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {getDeleteDialogDescription()}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {deleteStep === "choose" && (
            <div className="space-y-3 py-4">
              {/* Show selected users preview for bulk delete */}
              {isBulkDelete && usersToDelete.length > 0 && (
                <div className="p-3 rounded-lg bg-muted/50 border border-border mb-4 max-h-32 overflow-y-auto">
                  <p className="text-xs text-muted-foreground mb-2">Selected users:</p>
                  <div className="flex flex-wrap gap-1">
                    {usersToDelete.slice(0, 5).map(u => (
                      <span key={u.id} className="text-xs px-2 py-1 rounded-full bg-background border">
                        {u.profile?.full_name || "Unnamed"}
                      </span>
                    ))}
                    {usersToDelete.length > 5 && (
                      <span className="text-xs px-2 py-1 rounded-full bg-background border text-muted-foreground">
                        +{usersToDelete.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              )}

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
                      <span className="font-medium">Deactivate Account{isBulkDelete && usersToDelete.length > 1 ? 's' : ''}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                        Recommended
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Marks the account{isBulkDelete && usersToDelete.length > 1 ? 's' : ''} as deleted but preserves data. Can be recovered if needed.
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

              {isProcessing && isBulkDelete && (
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Deleting users...</span>
                    <span>{bulkProgress.current}/{bulkProgress.total}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-destructive transition-all duration-300"
                      style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}
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
                Deactivate {isBulkDelete ? `${usersToDelete.length} Account${usersToDelete.length > 1 ? 's' : ''}` : 'Account'}
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
                {isBulkDelete 
                  ? `Delete ${usersToDelete.length} Account${usersToDelete.length > 1 ? 's' : ''}`
                  : 'Permanently Delete'
                }
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
