import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  MessageSquare,
  Send,
  Search,
  CheckCircle,
  Circle,
  XCircle,
  Clock,
  User,
  Headset,
  RefreshCw,
} from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

interface SupportConversation {
  id: number;
  customerEmail: string;
  customerName: string;
  subject: string;
  status: string;
  assignedTo: string | null;
  lastMessageAt: string;
  createdAt: string;
}

interface SupportMessage {
  id: number;
  conversationId: number;
  senderType: string;
  senderName: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string; icon: any }> = {
    open: { label: "Open", color: "#22c55e", icon: Circle },
    resolved: { label: "Resolved", color: "#C9A84C", icon: CheckCircle },
    closed: { label: "Closed", color: "#6b7280", icon: XCircle },
  };
  const s = config[status] || config.open;
  const Icon = s.icon;
  return (
    <Badge
      variant="outline"
      className="text-xs gap-1"
      style={{ borderColor: s.color, color: s.color }}
      data-testid={`badge-status-${status}`}
    >
      <Icon className="h-3 w-3" />
      {s.label}
    </Badge>
  );
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

export default function SupportChat() {
  const { t } = useLanguage();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [replyText, setReplyText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMsgIdRef = useRef<number>(0);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: conversations = [], isLoading: loadingConversations } = useQuery<SupportConversation[]>({
    queryKey: ["/api/support/conversations"],
    refetchInterval: 5000,
  });

  const { data: unreadCount } = useQuery<{ count: number }>({
    queryKey: ["/api/support/unread-count"],
    refetchInterval: 5000,
  });

  const { data: messages = [], isLoading: loadingMessages, refetch: refetchMessages } = useQuery<SupportMessage[]>({
    queryKey: ["/api/support/conversations", selectedId, "messages"],
    enabled: !!selectedId,
  });

  const sendReply = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", `/api/support/conversations/${selectedId}/messages`, { content });
      return res.json();
    },
    onSuccess: () => {
      setReplyText("");
      refetchMessages();
      queryClient.invalidateQueries({ queryKey: ["/api/support/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/support/unread-count"] });
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/support/conversations/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/support/conversations"] });
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (messages.length > 0) {
      lastMsgIdRef.current = messages[messages.length - 1].id;
    }
  }, [messages]);

  const pollNewMessages = useCallback(async () => {
    if (!selectedId) return;
    try {
      const res = await fetch(`/api/support/conversations/${selectedId}/poll?after=${lastMsgIdRef.current}`);
      const newMsgs = await res.json();
      if (newMsgs.length > 0) {
        refetchMessages();
        queryClient.invalidateQueries({ queryKey: ["/api/support/unread-count"] });
      }
    } catch {}
  }, [selectedId, refetchMessages]);

  useEffect(() => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (selectedId) {
      pollIntervalRef.current = setInterval(pollNewMessages, 3000);
    }
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [selectedId, pollNewMessages]);

  const filtered = conversations.filter((c) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        c.customerName.toLowerCase().includes(s) ||
        c.customerEmail.toLowerCase().includes(s) ||
        c.subject.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const selectedConv = conversations.find((c) => c.id === selectedId);

  const handleSend = () => {
    if (!replyText.trim() || sendReply.isPending) return;
    sendReply.mutate(replyText.trim());
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex" data-testid="support-chat-page">
      <div className="w-80 lg:w-96 border-r flex flex-col bg-background shrink-0">
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Headset className="h-5 w-5" style={{ color: "#C9A84C" }} />
              <h2 className="font-bold text-lg" data-testid="text-support-title">Support Chat</h2>
            </div>
            {(unreadCount?.count ?? 0) > 0 && (
              <Badge className="text-xs" style={{ backgroundColor: "#C9A84C", color: "#0A1628" }} data-testid="badge-unread-total">
                {unreadCount?.count} unread
              </Badge>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="pl-9 h-9"
              data-testid="input-search-conversations"
            />
          </div>
          <div className="flex gap-1">
            {["all", "open", "resolved", "closed"].map((s) => (
              <Button
                key={s}
                size="sm"
                variant={statusFilter === s ? "default" : "ghost"}
                className="text-xs h-7 px-2.5 capitalize"
                style={statusFilter === s ? { backgroundColor: "#0A1628", color: "#C9A84C" } : {}}
                onClick={() => setStatusFilter(s)}
                data-testid={`filter-status-${s}`}
              >
                {s}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto" data-testid="conversation-list">
          {loadingConversations ? (
            <div className="flex items-center justify-center p-8">
              <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No conversations found
            </div>
          ) : (
            filtered.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedId(conv.id)}
                className={`w-full text-left p-3 border-b hover:bg-muted/50 transition-colors ${
                  selectedId === conv.id ? "bg-muted border-l-2" : ""
                }`}
                style={selectedId === conv.id ? { borderLeftColor: "#C9A84C" } : {}}
                data-testid={`conversation-item-${conv.id}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{conv.customerName}</p>
                    <p className="text-xs text-muted-foreground truncate">{conv.subject}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{conv.customerEmail}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <StatusBadge status={conv.status} />
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      {formatTime(conv.lastMessageAt)}
                    </span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-muted/20">
        {!selectedId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <MessageSquare className="h-16 w-16 opacity-20" />
            <p className="text-lg font-medium">Select a conversation</p>
            <p className="text-sm">Choose a conversation from the left panel to start replying</p>
          </div>
        ) : (
          <>
            <div className="p-4 border-b bg-background flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(201,168,76,0.15)" }}>
                  <User className="h-4 w-4" style={{ color: "#C9A84C" }} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate" data-testid="text-conv-customer">{selectedConv?.customerName}</p>
                    <StatusBadge status={selectedConv?.status || "open"} />
                  </div>
                  <p className="text-xs text-muted-foreground truncate" data-testid="text-conv-subject">{selectedConv?.subject}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {selectedConv?.status === "open" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-8 gap-1"
                    style={{ borderColor: "#C9A84C", color: "#C9A84C" }}
                    onClick={() => updateStatus.mutate({ id: selectedId, status: "resolved" })}
                    disabled={updateStatus.isPending}
                    data-testid="button-resolve-conv"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    Resolve
                  </Button>
                )}
                {selectedConv?.status === "resolved" && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8 gap-1"
                      onClick={() => updateStatus.mutate({ id: selectedId, status: "open" })}
                      disabled={updateStatus.isPending}
                      data-testid="button-reopen-conv"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Reopen
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8 gap-1 text-destructive border-destructive"
                      onClick={() => updateStatus.mutate({ id: selectedId, status: "closed" })}
                      disabled={updateStatus.isPending}
                      data-testid="button-close-conv"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Close
                    </Button>
                  </>
                )}
                {selectedConv?.status === "closed" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-8 gap-1"
                    onClick={() => updateStatus.mutate({ id: selectedId, status: "open" })}
                    disabled={updateStatus.isPending}
                    data-testid="button-reopen-closed"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Reopen
                  </Button>
                )}
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3" data-testid="message-thread">
              {loadingMessages ? (
                <div className="flex items-center justify-center p-8">
                  <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-2 ${msg.senderType === "admin" ? "justify-end" : "justify-start"}`}
                    data-testid={`message-${msg.id}`}
                  >
                    {msg.senderType === "customer" && (
                      <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-1" style={{ backgroundColor: "rgba(201,168,76,0.15)" }}>
                        <User className="h-4 w-4" style={{ color: "#C9A84C" }} />
                      </div>
                    )}
                    <div className="max-w-[70%]">
                      <div className={`flex items-center gap-1.5 mb-0.5 ${msg.senderType === "admin" ? "justify-end" : ""}`}>
                        <span className="text-xs font-medium">{msg.senderName}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <div
                        className={`px-3.5 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${
                          msg.senderType === "admin"
                            ? "rounded-br-sm text-white"
                            : "rounded-bl-sm bg-background border shadow-sm"
                        }`}
                        style={msg.senderType === "admin" ? { background: "linear-gradient(135deg, #0A1628, #162035)" } : {}}
                      >
                        {msg.content}
                      </div>
                    </div>
                    {msg.senderType === "admin" && (
                      <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-1" style={{ backgroundColor: "#0A162820" }}>
                        <Headset className="h-4 w-4" style={{ color: "#0A1628" }} />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {selectedConv?.status !== "closed" && (
              <div className="p-3 border-t bg-background">
                <div className="flex gap-2">
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Type your reply... (Enter to send, Shift+Enter for new line)"
                    className="min-h-[44px] max-h-32 resize-none text-sm"
                    rows={1}
                    disabled={sendReply.isPending}
                    data-testid="input-reply-message"
                  />
                  <Button
                    size="icon"
                    className="h-10 w-10 shrink-0 rounded-xl"
                    style={{ backgroundColor: "#0A1628" }}
                    onClick={handleSend}
                    disabled={!replyText.trim() || sendReply.isPending}
                    data-testid="button-send-reply"
                  >
                    <Send className="h-4 w-4 text-white" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
