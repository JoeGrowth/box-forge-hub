import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Send, Loader2, MessageSquare, Search } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

interface Profile {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
}

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

const Messages = () => {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  // Sidebar state
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithDetails | null>(null);
  
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

  // Fetch all conversations
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
          
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("user_id", otherUserId)
            .single();

          const { data: lastMsg } = await supabase
            .from("chat_messages")
            .select("content, created_at")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

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
          
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("user_id", otherUserId)
            .single();

          const { data: lastMsg } = await supabase
            .from("direct_messages")
            .select("content, created_at")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

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

      // Auto-select conversation from URL or first available
      if (conversationId) {
        const conv = allConversations.find(c => c.id === conversationId);
        if (conv) {
          setSelectedConversation(conv);
        }
      } else if (allConversations.length > 0 && !selectedConversation) {
        setSelectedConversation(allConversations[0]);
        navigate(`/messages/${allConversations[0].id}`, { replace: true });
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoadingConversations(false);
    }
  };

  useEffect(() => {
    fetchConversations();

    // Subscribe to realtime updates
    const appChannel = supabase
      .channel("messages-app-updates")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        () => fetchConversations()
      )
      .subscribe();

    const directChannel = supabase
      .channel("messages-direct-updates")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages" },
        () => fetchConversations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(appChannel);
      supabase.removeChannel(directChannel);
    };
  }, [user]);

  // Update selected conversation when URL changes
  useEffect(() => {
    if (conversationId && conversations.length > 0) {
      const conv = conversations.find(c => c.id === conversationId);
      if (conv) {
        setSelectedConversation(conv);
      }
    }
  }, [conversationId, conversations]);

  // Fetch messages for selected conversation
  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedConversation || !user) return;

      setLoadingMessages(true);
      setMessages([]);
      setOtherUser(null);

      try {
        // Get other user profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .eq("user_id", selectedConversation.otherUserId)
          .single();

        if (profileData) {
          setOtherUser(profileData);
        }

        // Get messages based on conversation type
        const table = selectedConversation.type === "application" ? "chat_messages" : "direct_messages";
        const { data, error } = await supabase
          .from(table)
          .select("*")
          .eq("conversation_id", selectedConversation.id)
          .order("created_at", { ascending: true });

        if (!error && data) {
          setMessages(data);
          
          // Mark unread messages as read
          const unreadIds = data
            .filter(m => !m.is_read && m.sender_id !== user.id)
            .map(m => m.id);
          
          if (unreadIds.length > 0) {
            await supabase
              .from(table)
              .update({ is_read: true })
              .in("id", unreadIds);
            
            fetchConversations();
          }
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
      } finally {
        setLoadingMessages(false);
      }
    };

    fetchMessages();
  }, [selectedConversation, user]);

  // Subscribe to realtime messages for selected conversation
  useEffect(() => {
    if (!selectedConversation) return;

    const table = selectedConversation.type === "application" ? "chat_messages" : "direct_messages";
    const channel = supabase
      .channel(`chat-${selectedConversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: table,
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => [...prev, newMsg]);
          
          if (newMsg.sender_id !== user?.id) {
            supabase
              .from(table)
              .update({ is_read: true })
              .eq("id", newMsg.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation, user]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user || !otherUser) return;

    setSending(true);
    try {
      const table = selectedConversation.type === "application" ? "chat_messages" : "direct_messages";
      
      const { error } = await supabase.from(table).insert({
        conversation_id: selectedConversation.id,
        sender_id: user.id,
        content: newMessage.trim(),
      });

      if (error) throw error;

      // Create notification for the other user
      await supabase.from("user_notifications").insert({
        user_id: otherUser.user_id,
        notification_type: "chat_message",
        title: "New Message 💬",
        message: `${user.user_metadata?.full_name || "Someone"} sent you a message`,
        link: `/messages/${selectedConversation.id}`,
      });

      setNewMessage("");
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

  const handleConversationSelect = (conv: ConversationWithDetails) => {
    setSelectedConversation(conv);
    navigate(`/messages/${conv.id}`);
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const filteredConversations = conversations.filter(conv => 
    conv.otherUserName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.startupTitle?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[80vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <div className="flex-1 flex pt-16 h-[calc(100vh-64px)]">
        {/* Sidebar */}
        <div className="w-80 border-r border-border flex flex-col bg-card">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-border">
            <h2 className="text-xl font-semibold text-foreground mb-3">Messages</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          
          {/* Conversations List */}
          <ScrollArea className="flex-1">
            {loadingConversations ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground px-4">
                <MessageSquare className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm font-medium">No conversations</p>
                <p className="text-xs text-center mt-1">
                  Start chatting with co-builders from the directory!
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredConversations.map((conv) => (
                  <button
                    key={`${conv.type}-${conv.id}`}
                    className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors ${
                      selectedConversation?.id === conv.id ? "bg-muted" : ""
                    } ${conv.unreadCount > 0 ? "bg-primary/5" : ""}`}
                    onClick={() => handleConversationSelect(conv)}
                  >
                    <div className="flex gap-3">
                      <Avatar className="w-12 h-12 flex-shrink-0">
                        <AvatarImage src={conv.otherUserAvatar || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
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
                            <span className="w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-medium flex-shrink-0">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                        {conv.startupTitle && (
                          <p className="text-xs text-primary truncate">
                            {conv.startupTitle}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {conv.lastMessage || "No messages yet"}
                        </p>
                        {conv.lastMessageTime && (
                          <p className="text-xs text-muted-foreground/70 mt-0.5">
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
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="border-b border-border bg-card px-6 py-4">
                <div className="flex items-center gap-4">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={otherUser?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(otherUser?.full_name || null)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">
                      {otherUser?.full_name || "Loading..."}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedConversation.type === "application" 
                        ? `Re: ${selectedConversation.startupTitle || "Application"}`
                        : "Direct message"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-6">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <MessageSquare className="w-16 h-16 mb-4 opacity-50" />
                    <p className="font-medium">No messages yet</p>
                    <p className="text-sm mt-1">
                      Say hello to {otherUser?.full_name || "start the conversation"}!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => {
                      const isOwnMessage = message.sender_id === user?.id;
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                              isOwnMessage
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-foreground"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            <p
                              className={`text-xs mt-1 ${
                                isOwnMessage ? "text-primary-foreground/70" : "text-muted-foreground"
                              }`}
                            >
                              {format(new Date(message.created_at), "HH:mm")}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Input */}
              <div className="border-t border-border bg-card p-4">
                <div className="flex gap-3">
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
                    disabled={!newMessage.trim() || sending}
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
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <MessageSquare className="w-20 h-20 mb-4 opacity-30" />
              <p className="text-lg font-medium">Select a conversation</p>
              <p className="text-sm mt-1">Choose from your existing conversations to start chatting</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;
