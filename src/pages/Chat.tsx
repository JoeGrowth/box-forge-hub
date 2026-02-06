import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Send, Loader2, MessageSquare, Briefcase } from "lucide-react";
import { format } from "date-fns";
import { ChatFileUpload } from "@/components/chat/ChatFileUpload";
import { ChatMessageBubble } from "@/components/chat/ChatMessageBubble";

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  file_url?: string | null;
  file_name?: string | null;
  file_type?: string | null;
}

interface Conversation {
  id: string;
  application_id: string;
  initiator_id: string;
  applicant_id: string;
  startup_id: string;
}

interface Application {
  id: string;
  role_applied: string | null;
  cover_message: string | null;
  status: string;
  startup_ideas: {
    id: string;
    title: string;
  };
}

interface Profile {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
}

const Chat = () => {
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [pendingFile, setPendingFile] = useState<{ url: string; name: string; type: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [application, setApplication] = useState<Application | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Fetch or create conversation
  useEffect(() => {
    const fetchConversation = async () => {
      if (!user || !applicationId) return;

      try {
        // First get the application details
        const { data: appData, error: appError } = await supabase
          .from("startup_applications")
          .select(`
            id,
            role_applied,
            cover_message,
            status,
            applicant_id,
            startup_id,
            startup_ideas (
              id,
              title,
              creator_id
            )
          `)
          .eq("id", applicationId)
          .single();

        if (appError || !appData) {
          toast({
            title: "Error",
            description: "Application not found",
            variant: "destructive",
          });
          navigate("/profile");
          return;
        }

        setApplication(appData as unknown as Application);

        const startupIdea = appData.startup_ideas as unknown as { id: string; title: string; creator_id: string };
        const isInitiator = user.id === startupIdea.creator_id;
        const isApplicant = user.id === appData.applicant_id;

        if (!isInitiator && !isApplicant) {
          toast({
            title: "Access Denied",
            description: "You don't have access to this conversation",
            variant: "destructive",
          });
          navigate("/profile");
          return;
        }

        // Get or create conversation
        let { data: convData, error: convError } = await supabase
          .from("chat_conversations")
          .select("*")
          .eq("application_id", applicationId)
          .maybeSingle();

        if (!convData && isInitiator) {
          // Create conversation
          const { data: newConv, error: createError } = await supabase
            .from("chat_conversations")
            .insert({
              application_id: applicationId,
              initiator_id: startupIdea.creator_id,
              applicant_id: appData.applicant_id,
              startup_id: appData.startup_id,
            })
            .select()
            .single();

          if (createError) {
            console.error("Error creating conversation:", createError);
          } else {
            convData = newConv;
          }
        }

        if (convData) {
          setConversation(convData);
        }

        // Get other user's profile
        const otherUserId = isInitiator ? appData.applicant_id : startupIdea.creator_id;
        const { data: profileData } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .eq("user_id", otherUserId)
          .single();

        if (profileData) {
          setOtherUser(profileData);
        }
      } catch (error) {
        console.error("Error fetching conversation:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversation();
  }, [user, applicationId, navigate, toast]);

  // Fetch messages
  useEffect(() => {
    const fetchMessages = async () => {
      if (!conversation) return;

      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: true });

      if (!error && data) {
        setMessages(data);
        
        // Mark unread messages as read
        const unreadIds = data
          .filter(m => !m.is_read && m.sender_id !== user?.id)
          .map(m => m.id);
        
        if (unreadIds.length > 0) {
          await supabase
            .from("chat_messages")
            .update({ is_read: true })
            .in("id", unreadIds);
        }
      }
    };

    fetchMessages();
  }, [conversation, user]);

  // Subscribe to realtime messages
  useEffect(() => {
    if (!conversation) return;

    const channel = supabase
      .channel(`chat-${conversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => [...prev, newMsg]);
          
          // Mark as read if not from current user
          if (newMsg.sender_id !== user?.id) {
            supabase
              .from("chat_messages")
              .update({ is_read: true })
              .eq("id", newMsg.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation, user]);

  const handleFileUploaded = (fileUrl: string, fileName: string, fileType: string) => {
    if (fileUrl) {
      setPendingFile({ url: fileUrl, name: fileName, type: fileType });
    } else {
      setPendingFile(null);
    }
  };

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !pendingFile) || !conversation || !user) return;

    setSending(true);
    try {
      const { error } = await supabase.from("chat_messages").insert({
        conversation_id: conversation.id,
        sender_id: user.id,
        content: newMessage.trim(),
        file_url: pendingFile?.url || null,
        file_name: pendingFile?.name || null,
        file_type: pendingFile?.type || null,
      });

      if (error) throw error;

      // Create notification for the other user
      const recipientId = user.id === conversation.initiator_id 
        ? conversation.applicant_id 
        : conversation.initiator_id;

      await supabase.from("user_notifications").insert({
        user_id: recipientId,
        notification_type: "chat_message",
        title: "New Message 💬",
        message: `${user.user_metadata?.full_name || "Someone"} sent you ${pendingFile ? "a file" : "a message"}`,
        link: `/chat/${applicationId}`,
      });

      setNewMessage("");
      setPendingFile(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[80vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const isInitiator = user?.id === conversation?.initiator_id;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="border-b border-border bg-card px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            
            <Avatar className="w-10 h-10">
              <AvatarImage src={otherUser?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {otherUser?.full_name?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <h2 className="font-semibold text-foreground">
                {otherUser?.full_name || "Loading..."}
              </h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Briefcase className="w-3 h-3" />
                <span>{application?.startup_ideas?.title}</span>
                {application?.role_applied && (
                  <Badge variant="outline" className="text-xs">
                    {application.role_applied}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Application context message - always visible */}
          {application?.cover_message && (
            <div className="bg-muted/50 rounded-xl p-4 text-center sticky top-0 z-10 border border-border/50 shadow-sm">
              <MessageSquare className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
              <p className="text-xs text-muted-foreground mb-1">Application Message:</p>
              <p className="text-sm text-foreground italic">"{application.cover_message}"</p>
            </div>
          )}

          {messages.length === 0 && !application?.cover_message && (
            <div className="text-center text-muted-foreground py-12">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No messages yet</p>
              <p className="text-sm">Start the conversation!</p>
            </div>
          )}

          {messages.map((message) => (
            <ChatMessageBubble
              key={message.id}
              content={message.content}
              isOwnMessage={message.sender_id === user?.id}
              createdAt={message.created_at}
              fileUrl={message.file_url}
              fileName={message.file_name}
              fileType={message.file_type}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        {conversation ? (
          <div className="border-t border-border bg-card p-4">
            <div className="flex items-end gap-2">
              <ChatFileUpload
                userId={user?.id || ""}
                onFileUploaded={handleFileUploaded}
                disabled={sending}
              />
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1"
                disabled={sending}
              />
              <Button
                onClick={handleSendMessage}
                disabled={(!newMessage.trim() && !pendingFile) || sending}
                className="px-6"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="border-t border-border bg-muted/50 p-4 text-center text-sm text-muted-foreground">
            {isInitiator === false 
              ? "Waiting for the initiator to start the conversation..."
              : "Loading conversation..."}
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
