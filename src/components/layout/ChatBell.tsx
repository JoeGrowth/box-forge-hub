import { useState, useEffect } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

interface ConversationWithDetails {
  id: string;
  type: "application" | "direct";
  otherUserId: string;
  otherUserName: string | null;
  otherUserAvatar: string | null;
  lastMessage: string | null;
  lastMessageTime: string | null;
  unreadCount: number;
  applicationId?: string;
  startupTitle?: string;
}

export function ChatBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchConversations = async () => {
    if (!user) return;

    try {
      // Fetch application-based conversations
      const { data: appConvs } = await supabase
        .from("chat_conversations")
        .select(`
          id,
          application_id,
          initiator_id,
          applicant_id,
          startup_id,
          startup_ideas (title)
        `)
        .or(`initiator_id.eq.${user.id},applicant_id.eq.${user.id}`);

      // Fetch direct conversations
      const { data: directConvs } = await supabase
        .from("direct_conversations")
        .select("*")
        .or(`participant_one_id.eq.${user.id},participant_two_id.eq.${user.id}`);

      const allConversations: ConversationWithDetails[] = [];

      // Process application conversations
      if (appConvs) {
        for (const conv of appConvs) {
          const otherUserId = conv.initiator_id === user.id ? conv.applicant_id : conv.initiator_id;
          
          // Get other user's profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("user_id", otherUserId)
            .single();

          // Get last message
          const { data: lastMsg } = await supabase
            .from("chat_messages")
            .select("content, created_at")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          // Get unread count
          const { count } = await supabase
            .from("chat_messages")
            .select("*", { count: "exact", head: true })
            .eq("conversation_id", conv.id)
            .eq("is_read", false)
            .neq("sender_id", user.id);

          const startupIdea = conv.startup_ideas as unknown as { title: string } | null;

          allConversations.push({
            id: conv.id,
            type: "application",
            otherUserId,
            otherUserName: profile?.full_name || null,
            otherUserAvatar: profile?.avatar_url || null,
            lastMessage: lastMsg?.content || null,
            lastMessageTime: lastMsg?.created_at || null,
            unreadCount: count || 0,
            applicationId: conv.application_id,
            startupTitle: startupIdea?.title,
          });
        }
      }

      // Process direct conversations
      if (directConvs) {
        for (const conv of directConvs) {
          const otherUserId = conv.participant_one_id === user.id 
            ? conv.participant_two_id 
            : conv.participant_one_id;
          
          // Get other user's profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("user_id", otherUserId)
            .single();

          // Get last message
          const { data: lastMsg } = await supabase
            .from("direct_messages")
            .select("content, created_at")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          // Get unread count
          const { count } = await supabase
            .from("direct_messages")
            .select("*", { count: "exact", head: true })
            .eq("conversation_id", conv.id)
            .eq("is_read", false)
            .neq("sender_id", user.id);

          allConversations.push({
            id: conv.id,
            type: "direct",
            otherUserId,
            otherUserName: profile?.full_name || null,
            otherUserAvatar: profile?.avatar_url || null,
            lastMessage: lastMsg?.content || null,
            lastMessageTime: lastMsg?.created_at || null,
            unreadCount: count || 0,
          });
        }
      }

      // Sort by last message time
      allConversations.sort((a, b) => {
        if (!a.lastMessageTime && !b.lastMessageTime) return 0;
        if (!a.lastMessageTime) return 1;
        if (!b.lastMessageTime) return -1;
        return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
      });

      setConversations(allConversations);
      setTotalUnread(allConversations.reduce((sum, c) => sum + c.unreadCount, 0));
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();

    // Subscribe to realtime updates for both conversation types
    const appChannel = supabase
      .channel("chat-messages-updates")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    const directChannel = supabase
      .channel("direct-messages-updates")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(appChannel);
      supabase.removeChannel(directChannel);
    };
  }, [user]);

  const handleConversationClick = (conv: ConversationWithDetails) => {
    if (conv.type === "application" && conv.applicationId) {
      navigate(`/chat/${conv.applicationId}`);
    } else {
      navigate(`/messages/${conv.id}`);
    }
    setIsOpen(false);
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  if (!user) return null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <MessageCircle size={18} />
          {totalUnread > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-b4-teal text-primary-foreground text-xs rounded-full flex items-center justify-center font-medium">
              {totalUnread > 9 ? "9+" : totalUnread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-foreground">Messages</h3>
        </div>
        <ScrollArea className="h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-b4-teal border-t-transparent rounded-full animate-spin" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <MessageCircle className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs mt-1">Start chatting with co-builders!</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {conversations.map((conv) => (
                <button
                  key={`${conv.type}-${conv.id}`}
                  className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors ${
                    conv.unreadCount > 0 ? "bg-b4-teal/5" : ""
                  }`}
                  onClick={() => handleConversationClick(conv)}
                >
                  <div className="flex gap-3">
                    <Avatar className="w-10 h-10 flex-shrink-0">
                      <AvatarImage src={conv.otherUserAvatar || undefined} />
                      <AvatarFallback className="bg-b4-teal/10 text-b4-teal text-sm">
                        {getInitials(conv.otherUserName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm font-medium truncate ${
                          conv.unreadCount > 0 ? "text-foreground" : "text-muted-foreground"
                        }`}>
                          {conv.otherUserName || "Unknown"}
                        </p>
                        {conv.unreadCount > 0 && (
                          <span className="w-5 h-5 bg-b4-teal text-primary-foreground text-xs rounded-full flex items-center justify-center font-medium flex-shrink-0">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                      {conv.startupTitle && (
                        <p className="text-xs text-b4-teal truncate">
                          {conv.startupTitle}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground truncate">
                        {conv.lastMessage || "No messages yet"}
                      </p>
                      {conv.lastMessageTime && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDistanceToNow(new Date(conv.lastMessageTime), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
