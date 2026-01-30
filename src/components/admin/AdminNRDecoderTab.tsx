import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Brain, Eye, MessageSquare, FileText, Check, Clock, Search, RefreshCw } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";

interface Submission {
  id: string;
  user_id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  status: string;
  answers: Record<string, string>;
  admin_notes: string | null;
  result_pdf_url: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
  email?: string;
}

const QUESTIONS = [
  "When people come to you for help, what is the type of help they expect?",
  "What is something you do easily that others find difficult?",
  "What are you doing when you feel 'in flow'?",
  "What result do you produce without even trying?",
  "Finish the sentence: 'What I naturally do is: to __'",
  "What is the most repeated positive feedback you hear about your work?",
  "If you could only solve ONE type of problem for the world, which problem would you choose?",
];

export const AdminNRDecoderTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const { data: submissionsData, error } = await supabase
        .from("nr_decoder_submissions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles for all users
      const userIds = submissionsData?.map(s => s.user_id) || [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);

      // Map profiles to submissions
      const enrichedSubmissions: Submission[] = submissionsData?.map(sub => {
        const profile = profiles?.find(p => p.user_id === sub.user_id);
        return {
          id: sub.id,
          user_id: sub.user_id,
          status: sub.status,
          answers: (sub.answers || {}) as Record<string, string>,
          admin_notes: sub.admin_notes,
          result_pdf_url: sub.result_pdf_url,
          reviewed_by: sub.reviewed_by,
          reviewed_at: sub.reviewed_at,
          created_at: sub.created_at,
          profile: profile ? {
            full_name: profile.full_name,
            avatar_url: profile.avatar_url,
          } : undefined,
        };
      }) || [];

      setSubmissions(enrichedSubmissions);
    } catch (error: any) {
      console.error("Failed to fetch submissions:", error);
      toast({
        title: "Error",
        description: "Failed to load submissions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("admin-nr-decoder")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "nr_decoder_submissions" },
        () => {
          fetchSubmissions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleViewSubmission = (submission: Submission) => {
    setSelectedSubmission(submission);
    setAdminNotes(submission.admin_notes || "");
    setViewDialogOpen(true);
  };

  const handleMarkAsReviewed = async () => {
    if (!selectedSubmission || !user) return;
    
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("nr_decoder_submissions")
        .update({
          status: "reviewed",
          admin_notes: adminNotes,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", selectedSubmission.id);

      if (error) throw error;

      // Send notification to user
      await supabase.from("user_notifications").insert({
        user_id: selectedSubmission.user_id,
        notification_type: "nr_decoder_reviewed",
        title: "Natural Role Decoder Reviewed",
        message: "Your Natural Role Decoder submission has been reviewed. An admin will contact you with your personalized blueprint.",
        link: "/messages",
      });

      toast({
        title: "Marked as Reviewed",
        description: "The user has been notified.",
      });
      
      setViewDialogOpen(false);
      fetchSubmissions();
    } catch (error: any) {
      console.error("Failed to update:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update submission",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStartChat = async (submission: Submission) => {
    if (!user) return;

    try {
      // Check for existing conversation
      const { data: existingConv } = await supabase
        .from("direct_conversations")
        .select("id")
        .or(`and(participant_one_id.eq.${user.id},participant_two_id.eq.${submission.user_id}),and(participant_one_id.eq.${submission.user_id},participant_two_id.eq.${user.id})`)
        .single();

      if (existingConv) {
        navigate(`/messages/${existingConv.id}`);
        return;
      }

      // Create new conversation
      const { data: newConv, error } = await supabase
        .from("direct_conversations")
        .insert({
          participant_one_id: user.id,
          participant_two_id: submission.user_id,
        })
        .select()
        .single();

      if (error) throw error;

      // Send initial message with NR context
      const introMessage = `Hi ${submission.profile?.full_name || "there"}! 👋\n\nI've reviewed your Natural Role Decoder submission. Let me share your personalized blueprint with you.`;
      
      await supabase.from("direct_messages").insert({
        conversation_id: newConv.id,
        sender_id: user.id,
        content: introMessage,
      });

      // Update submission status
      await supabase
        .from("nr_decoder_submissions")
        .update({ status: "completed" })
        .eq("id", submission.id);

      navigate(`/messages/${newConv.id}`);
    } catch (error: any) {
      console.error("Failed to start chat:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to start chat",
        variant: "destructive",
      });
    }
  };

  const filteredSubmissions = submissions.filter(sub => {
    const name = sub.profile?.full_name?.toLowerCase() || "";
    return name.includes(searchQuery.toLowerCase());
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "reviewed":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-200"><Eye className="w-3 h-3 mr-1" />Reviewed</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200"><Check className="w-3 h-3 mr-1" />Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Loading submissions...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-b4-teal/10 flex items-center justify-center">
            <Brain className="w-5 h-5 text-b4-teal" />
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold">NR Decoder Submissions</h2>
            <p className="text-sm text-muted-foreground">{submissions.length} total submissions</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchSubmissions}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      {filteredSubmissions.length === 0 ? (
        <div className="text-center py-12 bg-muted/50 rounded-lg">
          <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No submissions found</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubmissions.map((submission) => (
                <TableRow key={submission.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={submission.profile?.avatar_url || undefined} />
                        <AvatarFallback className="bg-b4-teal/10 text-b4-teal text-xs">
                          {submission.profile?.full_name?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">
                        {submission.profile?.full_name || "Unknown User"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(submission.created_at), "MMM d, yyyy 'at' h:mm a")}
                  </TableCell>
                  <TableCell>{getStatusBadge(submission.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewSubmission(submission)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="teal"
                        size="sm"
                        onClick={() => handleStartChat(submission)}
                      >
                        <MessageSquare className="w-4 h-4 mr-1" />
                        Chat
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-b4-teal" />
              NR Decoder Submission
            </DialogTitle>
            <DialogDescription>
              {selectedSubmission?.profile?.full_name || "Unknown User"} - 
              {selectedSubmission && format(new Date(selectedSubmission.created_at), " MMMM d, yyyy")}
            </DialogDescription>
          </DialogHeader>

          {selectedSubmission && (
            <div className="space-y-6">
              {/* Answers */}
              <div className="space-y-4">
                {QUESTIONS.map((question, index) => (
                  <div key={index} className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm font-medium text-foreground mb-2">
                      {index + 1}. {question}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedSubmission.answers[index + 1] || "No answer provided"}
                    </p>
                  </div>
                ))}
              </div>

              {/* Admin Notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Admin Notes</label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this submission..."
                  className="min-h-[100px]"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                  Cancel
                </Button>
                {selectedSubmission.status === "pending" && (
                  <Button
                    variant="teal"
                    onClick={handleMarkAsReviewed}
                    disabled={isUpdating}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    {isUpdating ? "Updating..." : "Mark as Reviewed"}
                  </Button>
                )}
                <Button
                  variant="default"
                  onClick={() => handleStartChat(selectedSubmission)}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Start Chat
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
