import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/**
 * Legacy route `/chat/:applicationId` — resolves (or creates) the
 * application-linked conversation and redirects to the unified
 * `/messages/:conversationId` surface.
 */
const Chat = () => {
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }
    if (!applicationId) {
      navigate("/messages", { replace: true });
      return;
    }

    const resolve = async () => {
      try {
        const { data: appData, error: appError } = await supabase
          .from("startup_applications")
          .select("id, applicant_id, startup_id, startup_ideas(creator_id)")
          .eq("id", applicationId)
          .single();

        if (appError || !appData) throw appError ?? new Error("Application not found");

        const startupIdea = appData.startup_ideas as unknown as { creator_id: string };
        const isInitiator = user.id === startupIdea.creator_id;
        const isApplicant = user.id === appData.applicant_id;
        if (!isInitiator && !isApplicant) {
          toast({ title: "Access Denied", description: "You don't have access to this conversation", variant: "destructive" });
          navigate("/profile", { replace: true });
          return;
        }

        let { data: conv } = await supabase
          .from("chat_conversations")
          .select("id")
          .eq("application_id", applicationId)
          .maybeSingle();

        if (!conv && isInitiator) {
          const { data: newConv, error: createError } = await supabase
            .from("chat_conversations")
            .insert({
              application_id: applicationId,
              initiator_id: startupIdea.creator_id,
              applicant_id: appData.applicant_id,
              startup_id: appData.startup_id,
            })
            .select("id")
            .single();
          if (createError) throw createError;
          conv = newConv;
        }

        if (conv) {
          navigate(`/messages/${conv.id}`, { replace: true });
        } else {
          navigate("/messages", { replace: true });
        }
      } catch (err) {
        console.error("Chat redirect failed:", err);
        toast({ title: "Error", description: "Could not open conversation", variant: "destructive" });
        navigate("/messages", { replace: true });
      }
    };

    resolve();
  }, [user, authLoading, applicationId, navigate, toast]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex items-center justify-center h-[80vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    </div>
  );
};

export default Chat;
