import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, Check, X, Clock, Loader2, MessageSquare } from "lucide-react";

interface Training {
  id: string;
  user_id: string;
  title: string;
  description: string;
  target_audience: string | null;
  duration: string | null;
  format: string | null;
  sector: string | null;
  review_status: string;
  admin_notes: string | null;
  created_at: string;
  trainer_name?: string | null;
  trainer_email?: string | null;
}

export function AdminTrainingsTab() {
  const { toast } = useToast();
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchTrainings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("training_opportunities" as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      const userIds = (data as any[]).map((t: any) => t.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      setTrainings(
        (data as any[]).map((t: any) => ({
          ...t,
          trainer_name: profiles?.find((p) => p.user_id === t.user_id)?.full_name,
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTrainings();
  }, []);

  const handleReview = async (id: string, status: "approved" | "declined") => {
    setProcessingId(id);
    try {
      const { error } = await supabase
        .from("training_opportunities" as any)
        .update({
          review_status: status,
          admin_notes: adminNotes[id] || null,
          reviewed_at: new Date().toISOString(),
        } as any)
        .eq("id", id);

      if (error) throw error;

      toast({
        title: status === "approved" ? "Training Approved" : "Training Declined",
        description: status === "approved"
          ? "The training is now visible in Opportunities."
          : "The training has been declined.",
      });

      fetchTrainings();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const pendingTrainings = trainings.filter((t) => t.review_status === "pending");
  const reviewedTrainings = trainings.filter((t) => t.review_status !== "pending");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Pending */}
      <div>
        <h3 className="font-display text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-500" />
          Pending Review ({pendingTrainings.length})
        </h3>
        {pendingTrainings.length === 0 ? (
          <p className="text-muted-foreground text-sm">No pending training submissions.</p>
        ) : (
          <div className="space-y-4">
            {pendingTrainings.map((training) => (
              <Card key={training.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <GraduationCap className="w-5 h-5 text-amber-500" />
                        {training.title}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        By {training.trainer_name || "Unknown"} • {new Date(training.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-amber-600 border-amber-300">Pending</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-foreground">{training.description}</p>
                  
                  <div className="flex flex-wrap gap-2">
                    {training.sector && <Badge variant="secondary">{training.sector}</Badge>}
                    {training.format && <Badge variant="outline">{training.format}</Badge>}
                    {training.duration && <Badge variant="outline">{training.duration}</Badge>}
                    {training.target_audience && <Badge variant="outline">{training.target_audience}</Badge>}
                  </div>

                  <div>
                    <label className="text-sm font-medium flex items-center gap-1 mb-1">
                      <MessageSquare className="w-3 h-3" /> Admin Notes (optional)
                    </label>
                    <Textarea
                      placeholder="Add notes for internal reference..."
                      value={adminNotes[training.id] || ""}
                      onChange={(e) => setAdminNotes({ ...adminNotes, [training.id]: e.target.value })}
                      rows={2}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="teal"
                      size="sm"
                      onClick={() => handleReview(training.id, "approved")}
                      disabled={processingId === training.id}
                    >
                      {processingId === training.id ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleReview(training.id, "declined")}
                      disabled={processingId === training.id}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Decline
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Reviewed */}
      <div>
        <h3 className="font-display text-lg font-bold text-foreground mb-4">
          Reviewed ({reviewedTrainings.length})
        </h3>
        {reviewedTrainings.length === 0 ? (
          <p className="text-muted-foreground text-sm">No reviewed trainings yet.</p>
        ) : (
          <div className="space-y-3">
            {reviewedTrainings.map((training) => (
              <div key={training.id} className="flex items-center justify-between p-4 bg-card rounded-lg border">
                <div>
                  <p className="font-medium text-foreground">{training.title}</p>
                  <p className="text-sm text-muted-foreground">
                    By {training.trainer_name || "Unknown"} • {new Date(training.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Badge
                  variant={training.review_status === "approved" ? "default" : "destructive"}
                  className={training.review_status === "approved" ? "bg-b4-teal" : ""}
                >
                  {training.review_status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
