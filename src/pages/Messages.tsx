import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Send,
  Loader2,
  MessageSquare,
  Search,
  ArrowLeft,
  Rocket,
  User as UserIcon,
  PenSquare,
  Paperclip,
  ExternalLink,
} from "lucide-react";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
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

interface Profile {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  professional_title?: string | null;
}

interface ConversationWithDetails {
  id: string;
  type: "application" | "direct";
  otherUserId: string;
  otherUserName: string | null;
  otherUserAvatar: string | null;
  otherUserTitle: string | null;
  lastMessage: string | null;
  lastMessageTime: string | null;
  lastMessageFromMe: boolean;
  hasAttachment: boolean;
  unreadCount: number;
  applicationId?: string;
  startupId?: string;
  startupTitle?: string;
  coverMessage?: string | null;
}

type FilterKey = "all" | "unread" | "ventures" | "direct";

const dayLabel = (iso: string) => {
  const d = new Date(iso);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEEE, d MMM yyyy");
};

const Messages = () => {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  // Sidebar state
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [pendingFile, setPendingFile] = useState<{ url: string; name: string; type: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithDetails | null>(null);

  // New conversation dialog
  const [composeOpen, setComposeOpen] = useState(false);
  const [peopleQuery, setPeopleQuery] = useState("");
  const [people, setPeople] = useState<Profile[]>([]);
  const [searchingPeople, setSearchingPeople] = useState(false);
  const [startingChat, setStartingChat] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Keep the composer focused on conversation switch
  useEffect(() => {
    if (selectedConversation) composerRef.current?.focus();
  }, [selectedConversation?.id]);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Fetch all conversations (batched — no per-row profile round trips)
  const fetchConversations = useCallback(async () => {
    if (!user) return;

    try {
      const [{ data: appConvs }, { data: directConvs }] = await Promise.all([
        supabase
          .from("chat_conversations")
          .select(`id, application_id, initiator_id, applicant_id, startup_id, startup_ideas (title)`)
          .or(`initiator_id.eq.${user.id},applicant_id.eq.${user.id}`),
        supabase
          .from("direct_conversations")
          .select("*")
          .or(`participant_one_id.eq.${user.id},participant_two_id.eq.${user.id}`),
      ]);

      const appIds = (appConvs || []).map((c) => c.id);
      const directIds = (directConvs || []).map((c) => c.id);
      const otherIds = new Set<string>();
      (appConvs || []).forEach((c) =>
        otherIds.add(c.initiator_id === user.id ? c.applicant_id : c.initiator_id)
      );
      (directConvs || []).forEach((c) =>
        otherIds.add(c.participant_one_id === user.id ? c.participant_two_id : c.participant_one_id)
      );

      const [{ data: profiles }, { data: appMsgs }, { data: directMsgs }, { data: apps }] =
        await Promise.all([
          otherIds.size
            ? supabase
                .from("profiles")
                .select("user_id, full_name, avatar_url, professional_title")
                .in("user_id", Array.from(otherIds))
            : Promise.resolve({ data: [] as Profile[] } as never),
          appIds.length
            ? supabase
                .from("chat_messages")
                .select("conversation_id, content, created_at, sender_id, is_read, file_url")
                .in("conversation_id", appIds)
                .order("created_at", { ascending: true })
            : Promise.resolve({ data: [] as never[] } as never),
          directIds.length
            ? supabase
                .from("direct_messages")
                .select("conversation_id, content, created_at, sender_id, is_read, file_url")
                .in("conversation_id", directIds)
                .order("created_at", { ascending: true })
            : Promise.resolve({ data: [] as never[] } as never),
          (appConvs || []).length
            ? supabase
                .from("startup_applications")
                .select("id, cover_message")
                .in(
                  "id",
                  (appConvs || []).map((c) => c.application_id)
                )
            : Promise.resolve({ data: [] as never[] } as never),
        ]);

      const profileMap = new Map<string, Profile>(
        ((profiles as Profile[]) || []).map((p) => [p.user_id, p])
      );
      const coverMap = new Map<string, string | null>(
        ((apps as { id: string; cover_message: string | null }[]) || []).map((a) => [
          a.id,
          a.cover_message,
        ])
      );

      type MsgRow = {
        conversation_id: string;
        content: string;
        created_at: string;
        sender_id: string;
        is_read: boolean;
        file_url: string | null;
      };
      const summarize = (rows: MsgRow[]) => {
        const map = new Map<string, { last: MsgRow; unread: number }>();
        rows.forEach((m) => {
          const entry = map.get(m.conversation_id) || { last: m, unread: 0 };
          entry.last = m; // rows are ascending → last wins
          if (!m.is_read && m.sender_id !== user.id) entry.unread += 1;
          map.set(m.conversation_id, entry);
        });
        return map;
      };

      const appSummary = summarize((appMsgs as MsgRow[]) || []);
      const directSummary = summarize((directMsgs as MsgRow[]) || []);

      const allConversations: ConversationWithDetails[] = [];

      (appConvs || []).forEach((conv) => {
        const otherUserId = conv.initiator_id === user.id ? conv.applicant_id : conv.initiator_id;
        const profile = profileMap.get(otherUserId);
        const summary = appSummary.get(conv.id);
        const startupIdea = conv.startup_ideas as unknown as { title: string } | null;
        allConversations.push({
          id: conv.id,
          type: "application",
          otherUserId,
          otherUserName: profile?.full_name || null,
          otherUserAvatar: profile?.avatar_url || null,
          otherUserTitle: profile?.professional_title || null,
          lastMessage: summary?.last.content || null,
          lastMessageTime: summary?.last.created_at || null,
          lastMessageFromMe: summary?.last.sender_id === user.id,
          hasAttachment: !!summary?.last.file_url,
          unreadCount: summary?.unread || 0,
          applicationId: conv.application_id,
          startupId: conv.startup_id,
          startupTitle: startupIdea?.title,
          coverMessage: coverMap.get(conv.application_id) || null,
        });
      });

      (directConvs || []).forEach((conv) => {
        const otherUserId =
          conv.participant_one_id === user.id ? conv.participant_two_id : conv.participant_one_id;
        const profile = profileMap.get(otherUserId);
        const summary = directSummary.get(conv.id);
        allConversations.push({
          id: conv.id,
          type: "direct",
          otherUserId,
          otherUserName: profile?.full_name || null,
          otherUserAvatar: profile?.avatar_url || null,
          otherUserTitle: profile?.professional_title || null,
          lastMessage: summary?.last.content || null,
          lastMessageTime: summary?.last.created_at || null,
          lastMessageFromMe: summary?.last.sender_id === user.id,
          hasAttachment: !!summary?.last.file_url,
          unreadCount: summary?.unread || 0,
        });
      });

      allConversations.sort((a, b) => {
        if (!a.lastMessageTime && !b.lastMessageTime) return 0;
        if (!a.lastMessageTime) return 1;
        if (!b.lastMessageTime) return -1;
        return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
      });

      setConversations(allConversations);

      if (conversationId) {
        const conv = allConversations.find((c) => c.id === conversationId);
        if (conv) setSelectedConversation(conv);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoadingConversations(false);
    }
  }, [user, conversationId]);

  useEffect(() => {
    fetchConversations();

    const appChannel = supabase
      .channel("messages-app-updates")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, () =>
        fetchConversations()
      )
      .subscribe();

    const directChannel = supabase
      .channel("messages-direct-updates")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages" }, () =>
        fetchConversations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(appChannel);
      supabase.removeChannel(directChannel);
    };
  }, [fetchConversations]);

  // Update selected conversation when URL changes
  useEffect(() => {
    if (conversationId && conversations.length > 0) {
      const conv = conversations.find((c) => c.id === conversationId);
      if (conv) setSelectedConversation(conv);
    }
    if (!conversationId) setSelectedConversation(null);
  }, [conversationId, conversations]);

  // Fetch messages for selected conversation
  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedConversation || !user) return;

      setLoadingMessages(true);
      setMessages([]);
      setOtherUser(null);

      try {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url, professional_title")
          .eq("user_id", selectedConversation.otherUserId)
          .maybeSingle();

        if (profileData) setOtherUser(profileData);

        const table = selectedConversation.type === "application" ? "chat_messages" : "direct_messages";
        const { data, error } = await supabase
          .from(table)
          .select("*")
          .eq("conversation_id", selectedConversation.id)
          .order("created_at", { ascending: true });

        if (!error && data) {
          setMessages(data);

          const unreadIds = data
            .filter((m) => !m.is_read && m.sender_id !== user.id)
            .map((m) => m.id);

          if (unreadIds.length > 0) {
            await supabase.from(table).update({ is_read: true }).in("id", unreadIds);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation?.id, user]);

  // Realtime for the open conversation
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
          table,
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => (prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]));
          if (newMsg.sender_id !== user?.id) {
            supabase.from(table).update({ is_read: true }).eq("id", newMsg.id);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table,
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        (payload) => {
          const updated = payload.new as Message;
          setMessages((prev) => prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation?.id, selectedConversation?.type, user]);

  // People search for new conversations
  useEffect(() => {
    if (!composeOpen || !user) return;
    const handle = setTimeout(async () => {
      setSearchingPeople(true);
      let query = supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, professional_title")
        .neq("user_id", user.id)
        .limit(12);
      if (peopleQuery.trim()) query = query.ilike("full_name", `%${peopleQuery.trim()}%`);
      const { data } = await query;
      setPeople((data as Profile[]) || []);
      setSearchingPeople(false);
    }, 250);
    return () => clearTimeout(handle);
  }, [peopleQuery, composeOpen, user]);

  const startDirectConversation = async (target: Profile) => {
    if (!user) return;
    setStartingChat(target.user_id);
    try {
      const { data: existing } = await supabase
        .from("direct_conversations")
        .select("id")
        .or(
          `and(participant_one_id.eq.${user.id},participant_two_id.eq.${target.user_id}),and(participant_one_id.eq.${target.user_id},participant_two_id.eq.${user.id})`
        )
        .maybeSingle();

      let id = existing?.id;
      if (!id) {
        const { data: created, error } = await supabase
          .from("direct_conversations")
          .insert({ participant_one_id: user.id, participant_two_id: target.user_id })
          .select("id")
          .single();
        if (error) throw error;
        id = created.id;
      }
      setComposeOpen(false);
      setPeopleQuery("");
      await fetchConversations();
      navigate(`/messages/${id}`);
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Could not start the conversation", variant: "destructive" });
    } finally {
      setStartingChat(null);
    }
  };

  const handleFileUploaded = (fileUrl: string, fileName: string, fileType: string) => {
    setPendingFile(fileUrl ? { url: fileUrl, name: fileName, type: fileType } : null);
  };

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !pendingFile) || !selectedConversation || !user) return;

    setSending(true);
    try {
      const table = selectedConversation.type === "application" ? "chat_messages" : "direct_messages";

      const { error } = await supabase.from(table).insert({
        conversation_id: selectedConversation.id,
        sender_id: user.id,
        content: newMessage.trim(),
        file_url: pendingFile?.url || null,
        file_name: pendingFile?.name || null,
        file_type: pendingFile?.type || null,
      });

      if (error) throw error;

      await supabase.from("user_notifications").insert({
        user_id: selectedConversation.otherUserId,
        notification_type: "chat_message",
        title: "New message",
        message: `${user.user_metadata?.full_name || "Someone"} sent you ${
          pendingFile ? "a file" : "a message"
        }`,
        link: `/messages/${selectedConversation.id}`,
      });

      setNewMessage("");
      setPendingFile(null);
      composerRef.current?.focus();
    } catch (error) {
      toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const totalUnread = useMemo(
    () => conversations.reduce((sum, c) => sum + c.unreadCount, 0),
    [conversations]
  );

  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return conversations.filter((conv) => {
      if (filter === "unread" && conv.unreadCount === 0) return false;
      if (filter === "ventures" && conv.type !== "application") return false;
      if (filter === "direct" && conv.type !== "direct") return false;
      if (!q) return true;
      return (
        conv.otherUserName?.toLowerCase().includes(q) ||
        conv.startupTitle?.toLowerCase().includes(q) ||
        conv.lastMessage?.toLowerCase().includes(q)
      );
    });
  }, [conversations, filter, searchQuery]);

  const filters: { key: FilterKey; label: string; count?: number }[] = [
    { key: "all", label: "All", count: conversations.length },
    { key: "unread", label: "Unread", count: totalUnread },
    { key: "ventures", label: "Ventures", count: conversations.filter((c) => c.type === "application").length },
    { key: "direct", label: "Direct", count: conversations.filter((c) => c.type === "direct").length },
  ];

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
        <div
          className={`${
            selectedConversation ? "hidden md:flex" : "flex"
          } w-full md:w-[22rem] border-r border-border flex-col bg-card`}
        >
          <div className="p-4 border-b border-border space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-foreground">Messages</h1>
                {totalUnread > 0 && (
                  <Badge variant="secondary" className="rounded-full">
                    {totalUnread}
                  </Badge>
                )}
              </div>
              <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1.5">
                    <PenSquare className="w-4 h-4" />
                    New
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Start a conversation</DialogTitle>
                    <DialogDescription>
                      Search a co-builder, initiator or advisor in the ecosystem.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      autoFocus
                      placeholder="Search by name..."
                      value={peopleQuery}
                      onChange={(e) => setPeopleQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <ScrollArea className="h-72 -mx-2 px-2">
                    {searchingPeople ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      </div>
                    ) : people.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No people found</p>
                    ) : (
                      <div className="space-y-1">
                        {people.map((p) => (
                          <button
                            key={p.user_id}
                            onClick={() => startDirectConversation(p)}
                            disabled={startingChat === p.user_id}
                            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors text-left"
                          >
                            <Avatar className="w-9 h-9">
                              <AvatarImage src={p.avatar_url || undefined} />
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {getInitials(p.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{p.full_name || "Unnamed"}</p>
                              {p.professional_title && (
                                <p className="text-xs text-muted-foreground truncate">{p.professional_title}</p>
                              )}
                            </div>
                            {startingChat === p.user_id && (
                              <Loader2 className="w-4 h-4 animate-spin text-primary" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </DialogContent>
              </Dialog>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search people, ventures, messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex gap-1.5 flex-wrap">
              {filters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    filter === f.key
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {f.label}
                  {typeof f.count === "number" && f.count > 0 ? ` · ${f.count}` : ""}
                </button>
              ))}
            </div>
          </div>

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
                  Start a conversation with a co-builder, or apply to a venture.
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
                    onClick={() => navigate(`/messages/${conv.id}`)}
                  >
                    <div className="flex gap-3">
                      <Avatar className="w-11 h-11 flex-shrink-0">
                        <AvatarImage src={conv.otherUserAvatar || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(conv.otherUserName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={`text-sm truncate ${
                              conv.unreadCount > 0 ? "font-semibold text-foreground" : "font-medium text-foreground/80"
                            }`}
                          >
                            {conv.otherUserName || "Unknown"}
                          </p>
                          {conv.lastMessageTime && (
                            <span className="text-[10px] text-muted-foreground flex-shrink-0">
                              {formatDistanceToNow(new Date(conv.lastMessageTime), { addSuffix: true })}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 mt-0.5">
                          {conv.type === "application" ? (
                            <Badge variant="outline" className="h-5 gap-1 px-1.5 text-[10px] font-normal">
                              <Rocket className="w-3 h-3" />
                              {conv.startupTitle || "Venture"}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="h-5 gap-1 px-1.5 text-[10px] font-normal">
                              <UserIcon className="w-3 h-3" />
                              Direct
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2 mt-1">
                          <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                            {conv.hasAttachment && <Paperclip className="w-3 h-3 flex-shrink-0" />}
                            {conv.lastMessage
                              ? `${conv.lastMessageFromMe ? "You: " : ""}${conv.lastMessage}`
                              : conv.hasAttachment
                              ? "Attachment"
                              : "No messages yet"}
                          </p>
                          {conv.unreadCount > 0 && (
                            <span className="min-w-5 h-5 px-1.5 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center font-medium flex-shrink-0">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Chat Area */}
        <div className={`${selectedConversation ? "flex" : "hidden md:flex"} flex-1 flex-col min-w-0`}>
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="border-b border-border bg-card px-3 sm:px-6 py-3 shadow-sm z-10">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden -ml-1"
                    onClick={() => navigate("/messages")}
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={otherUser?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(otherUser?.full_name || null)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-foreground truncate">
                      {otherUser?.full_name || selectedConversation.otherUserName || "Loading..."}
                    </h2>
                    <p className="text-xs text-muted-foreground truncate">
                      {otherUser?.professional_title ||
                        (selectedConversation.type === "application"
                          ? "Venture application"
                          : "Direct message")}
                    </p>
                  </div>
                  <div className="hidden sm:flex items-center gap-2">
                    <Button asChild variant="ghost" size="sm" className="gap-1.5">
                      <Link to={`/u/${selectedConversation.otherUserId}`}>
                        <UserIcon className="w-4 h-4" />
                        Profile
                      </Link>
                    </Button>
                    {selectedConversation.type === "application" && selectedConversation.startupId && (
                      <Button asChild variant="outline" size="sm" className="gap-1.5">
                        <Link to={`/opportunities/startup/${selectedConversation.startupId}`}>
                          <Rocket className="w-4 h-4" />
                          Venture
                          <ExternalLink className="w-3 h-3 opacity-60" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-3 sm:p-6">
                {selectedConversation.type === "application" && selectedConversation.coverMessage && (
                  <div className="bg-muted/50 rounded-xl p-4 mb-4 border border-border/50">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                      <Rocket className="w-3.5 h-3.5" />
                      Application to {selectedConversation.startupTitle || "this venture"}
                    </p>
                    <p className="text-sm text-foreground italic">"{selectedConversation.coverMessage}"</p>
                  </div>
                )}

                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : messages.length === 0 && !selectedConversation.coverMessage ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <MessageSquare className="w-16 h-16 mb-4 opacity-40" />
                    <p className="font-medium">No messages yet</p>
                    <p className="text-sm mt-1">
                      Open the conversation with {otherUser?.full_name || "your counterpart"}.
                    </p>
                  </div>
                ) : (
                  <div>
                    {messages.map((message, index) => {
                      const prev = messages[index - 1];
                      const showDay =
                        !prev ||
                        new Date(prev.created_at).toDateString() !==
                          new Date(message.created_at).toDateString();
                      const grouped =
                        !showDay &&
                        prev?.sender_id === message.sender_id &&
                        new Date(message.created_at).getTime() - new Date(prev.created_at).getTime() <
                          5 * 60 * 1000;
                      return (
                        <div key={message.id}>
                          {showDay && (
                            <div className="flex items-center gap-3 my-5">
                              <div className="h-px flex-1 bg-border" />
                              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                {dayLabel(message.created_at)}
                              </span>
                              <div className="h-px flex-1 bg-border" />
                            </div>
                          )}
                          <ChatMessageBubble
                            content={message.content}
                            isOwnMessage={message.sender_id === user?.id}
                            createdAt={message.created_at}
                            fileUrl={message.file_url}
                            fileName={message.file_name}
                            fileType={message.file_type}
                            isRead={message.is_read}
                            grouped={grouped}
                          />
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Composer */}
              <div className="border-t border-border bg-card p-2 sm:p-4">
                {pendingFile && (
                  <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
                    <Paperclip className="w-3.5 h-3.5" />
                    <span className="truncate flex-1">{pendingFile.name}</span>
                    <button
                      className="hover:text-foreground"
                      onClick={() => setPendingFile(null)}
                      aria-label="Remove attachment"
                    >
                      Remove
                    </button>
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <ChatFileUpload
                    userId={user?.id || ""}
                    onFileUploaded={handleFileUploaded}
                    disabled={sending}
                  />
                  <Textarea
                    ref={composerRef}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Write a message — Enter to send, Shift+Enter for a new line"
                    rows={1}
                    className="flex-1 resize-none max-h-40 min-h-[42px] bg-background"
                    disabled={sending}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={(!newMessage.trim() && !pendingFile) || sending}
                    size="icon"
                    className="h-[42px] w-[42px] flex-shrink-0"
                    aria-label="Send message"
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
              <p className="text-sm mt-1">Venture applications and direct messages live here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;
