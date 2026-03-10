import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, X, Send, Loader2, Bot, User, Headset, ArrowLeft, Plus } from "lucide-react";
import { useStoreLanguage } from "@/components/store-layout";
import logoImg from "@assets/WhatsApp_Image_2026-03-09_at_20.11.18_1773113178753.jpeg";

interface Message {
  role: "user" | "assistant";
  content: string;
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

interface SupportConversation {
  id: number;
  customerEmail: string;
  customerName: string;
  subject: string;
  status: string;
  lastMessageAt: string;
}

const QUICK_ACTIONS: Record<string, { en: string; fr: string; ar: string }[]> = {
  chips: [
    { en: "🔥 Best Sellers", fr: "🔥 Meilleures ventes", ar: "🔥 الأكثر مبيعاً" },
    { en: "🏷️ Promotions", fr: "🏷️ Promotions", ar: "🏷️ العروض" },
    { en: "📦 Track My Order", fr: "📦 Suivre ma commande", ar: "📦 تتبع طلبي" },
    { en: "💰 Payment Status", fr: "💰 État du paiement", ar: "💰 حالة الدفع" },
    { en: "💬 Talk to Support", fr: "💬 Parler au support", ar: "💬 تحدث مع الدعم" },
  ],
};

const SUPPORT_LABELS: Record<string, Record<string, string>> = {
  title: { en: "Live Support", fr: "Support en direct", ar: "الدعم المباشر" },
  back: { en: "Back to AI", fr: "Retour à l'IA", ar: "العودة للمساعد" },
  newConv: { en: "New Conversation", fr: "Nouvelle conversation", ar: "محادثة جديدة" },
  subject: { en: "Subject", fr: "Sujet", ar: "الموضوع" },
  yourName: { en: "Your Name", fr: "Votre nom", ar: "اسمك" },
  yourEmail: { en: "Your Email", fr: "Votre email", ar: "بريدك الإلكتروني" },
  message: { en: "Your message...", fr: "Votre message...", ar: "رسالتك..." },
  start: { en: "Start Chat", fr: "Démarrer", ar: "ابدأ المحادثة" },
  send: { en: "Send", fr: "Envoyer", ar: "إرسال" },
  resolved: { en: "This conversation has been resolved", fr: "Cette conversation a été résolue", ar: "تم حل هذه المحادثة" },
  closed: { en: "This conversation is closed", fr: "Cette conversation est fermée", ar: "هذه المحادثة مغلقة" },
  waiting: { en: "Waiting for support reply...", fr: "En attente de réponse...", ar: "في انتظار الرد..." },
  history: { en: "Previous Conversations", fr: "Conversations précédentes", ar: "المحادثات السابقة" },
  noHistory: { en: "No previous conversations", fr: "Aucune conversation", ar: "لا توجد محادثات سابقة" },
  loginForHistory: { en: "Login to see your conversation history", fr: "Connectez-vous pour voir l'historique", ar: "سجل الدخول لعرض المحادثات" },
};

function renderMessageContent(content: string) {
  const linkPattern = /((?:https?:\/\/[^\s]+)|(?:\/store\/[^\s,.)]+))/g;
  const parts = content.split(linkPattern);
  if (parts.length === 1) return content;
  const checkLink = /^(?:https?:\/\/|\/store\/)/;
  return parts.map((part, i) => {
    if (checkLink.test(part)) {
      const isExternal = part.startsWith("http");
      return (
        <a
          key={i}
          href={part}
          target={isExternal ? "_blank" : "_self"}
          rel={isExternal ? "noopener noreferrer" : undefined}
          className="underline font-medium"
          style={{ color: "#C9A84C" }}
          data-testid={`chat-link-${i}`}
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

function getLabel(key: string, lang: string) {
  return SUPPORT_LABELS[key]?.[lang] || SUPPORT_LABELS[key]?.en || key;
}

export default function LimjibaChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [greeted, setGreeted] = useState(false);
  const [showChips, setShowChips] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { lang } = useStoreLanguage();

  const [mode, setMode] = useState<"ai" | "support" | "new-support">("ai");
  const [supportConvId, setSupportConvId] = useState<number | null>(null);
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [supportConversations, setSupportConversations] = useState<SupportConversation[]>([]);
  const [supportLoading, setSupportLoading] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const lastSupportMsgIdRef = useRef<number>(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isLoggedIn = useCallback(() => {
    return document.cookie.includes("connect.sid") || !!localStorage.getItem("store-customer");
  }, []);

  useEffect(() => {
    if (open && !greeted) {
      setGreeted(true);
      setShowChips(true);
      const storedLang = localStorage.getItem("store-language") || "en";
      fetch(`/api/store/greeting?lang=${storedLang}`).then(r => r.json()).then(data => {
        setMessages([{ role: "assistant", content: data.greeting || "Welcome! How can I help you today?" }]);
      }).catch(() => {
        setMessages([{ role: "assistant", content: "Welcome! How can I help you today?" }]);
      });
    }
  }, [open, greeted]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, supportMessages]);

  const pollSupportMessages = useCallback(async () => {
    if (!supportConvId) return;
    try {
      const res = await fetch(`/api/store/support/conversations/${supportConvId}/poll?after=${lastSupportMsgIdRef.current}`);
      const newMsgs: SupportMessage[] = await res.json();
      if (newMsgs.length > 0) {
        setSupportMessages(prev => [...prev, ...newMsgs]);
        lastSupportMsgIdRef.current = newMsgs[newMsgs.length - 1].id;
      }
    } catch {}
  }, [supportConvId]);

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (mode === "support" && supportConvId) {
      pollRef.current = setInterval(pollSupportMessages, 3000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [mode, supportConvId, pollSupportMessages]);

  const loadSupportHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/store/support/conversations");
      if (res.ok) {
        const convs = await res.json();
        setSupportConversations(convs);
      }
    } catch {}
  }, []);

  const openSupportConversation = useCallback(async (convId: number) => {
    setSupportConvId(convId);
    setSupportLoading(true);
    try {
      const res = await fetch(`/api/store/support/conversations/${convId}/messages`);
      const msgs: SupportMessage[] = await res.json();
      setSupportMessages(msgs);
      if (msgs.length > 0) lastSupportMsgIdRef.current = msgs[msgs.length - 1].id;
    } catch {}
    setSupportLoading(false);
    setMode("support");
  }, []);

  const sendAiMessage = async (text?: string) => {
    const userMsg = (text || input).trim();
    if (!userMsg || loading) return;
    if (!text) setInput("");
    setShowChips(false);

    const chipEn = QUICK_ACTIONS.chips[4]?.en;
    const chipFr = QUICK_ACTIONS.chips[4]?.fr;
    const chipAr = QUICK_ACTIONS.chips[4]?.ar;
    if (userMsg === chipEn || userMsg === chipFr || userMsg === chipAr) {
      await loadSupportHistory();
      setMode("new-support");
      return;
    }

    const updatedMessages = [...messages, { role: "user" as const, content: userMsg }];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      const res = await fetch("/api/store/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, history: updatedMessages.slice(-10), lang }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.response || "Sorry, I couldn't process that." }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I'm having trouble connecting. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const startNewSupportConversation = async () => {
    if (!newSubject.trim() || !newMessage.trim()) return;
    setSupportLoading(true);
    try {
      const body: any = { subject: newSubject.trim(), message: newMessage.trim() };
      if (guestName) body.customerName = guestName.trim();
      if (guestEmail) body.customerEmail = guestEmail.trim();

      const res = await fetch("/api/store/support/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to start conversation");
        setSupportLoading(false);
        return;
      }
      const conv = await res.json();
      await openSupportConversation(conv.id);
      setNewSubject("");
      setNewMessage("");
      setGuestName("");
      setGuestEmail("");
    } catch {
      alert("Failed to start conversation");
    }
    setSupportLoading(false);
  };

  const sendSupportMessage = async () => {
    if (!input.trim() || !supportConvId || supportLoading) return;
    const content = input.trim();
    setInput("");
    setSupportLoading(true);
    try {
      const res = await fetch(`/api/store/support/conversations/${supportConvId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const msg = await res.json();
        setSupportMessages(prev => [...prev, msg]);
        lastSupportMsgIdRef.current = msg.id;
      }
    } catch {}
    setSupportLoading(false);
  };

  const switchToAi = () => {
    setMode("ai");
    setSupportConvId(null);
    setSupportMessages([]);
    setShowChips(true);
  };

  const chipLabel = (chip: { en: string; fr: string; ar: string }) => chip[lang] || chip.en;

  const renderAiMode = () => (
    <>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background: "linear-gradient(to bottom, #f0f3f8, #fff)" }}>
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-1" style={{ backgroundColor: "#0A162815" }}>
                <Bot className="h-3.5 w-3.5" style={{ color: "#0A1628" }} />
              </div>
            )}
            <div
              className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
                msg.role === "user" ? "rounded-br-sm text-white" : "rounded-bl-sm text-gray-800 bg-white border shadow-sm"
              }`}
              style={msg.role === "user" ? { background: "linear-gradient(135deg, #0A1628, #0D1520)" } : {}}
              data-testid={`chat-msg-${i}`}
            >
              {renderMessageContent(msg.content)}
            </div>
            {msg.role === "user" && (
              <div className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-1" style={{ backgroundColor: "#C9A84C20" }}>
                <User className="h-3.5 w-3.5" style={{ color: "#C9A84C" }} />
              </div>
            )}
          </div>
        ))}

        {showChips && messages.length > 0 && !loading && (
          <div className="flex flex-wrap gap-2 mt-2" data-testid="chat-quick-actions">
            {QUICK_ACTIONS.chips.map((chip, i) => (
              <button
                key={i}
                onClick={() => sendAiMessage(chipLabel(chip))}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border bg-white hover:bg-[#0A1628]/5 transition-colors shadow-sm whitespace-nowrap ${
                  i === 4 ? "border-[#C9A84C]/40 text-[#C9A84C]" : "border-[#0A1628]/20 text-[#0A1628]"
                }`}
                data-testid={`chip-action-${i}`}
              >
                {chipLabel(chip)}
              </button>
            ))}
          </div>
        )}

        {loading && (
          <div className="flex gap-2">
            <div className="h-7 w-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#0A162815" }}>
              <Bot className="h-3.5 w-3.5" style={{ color: "#0A1628" }} />
            </div>
            <div className="bg-white border shadow-sm rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1">
                <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="p-3 border-t bg-white">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendAiMessage()}
            placeholder={lang === "ar" ? "اسأل عن المنتجات، الطلبات..." : lang === "fr" ? "Posez vos questions..." : "Ask about products, orders..."}
            className="rounded-full text-sm"
            disabled={loading}
            data-testid="input-chat-message"
          />
          <Button
            size="sm"
            className="rounded-full h-9 w-9 p-0 shrink-0"
            style={{ backgroundColor: "#0A1628" }}
            onClick={() => sendAiMessage()}
            disabled={!input.trim() || loading}
            data-testid="button-send-chat"
          >
            <Send className="h-4 w-4 text-white" />
          </Button>
        </div>
      </div>
    </>
  );

  const renderNewSupportForm = () => (
    <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ background: "linear-gradient(to bottom, #f0f3f8, #fff)" }}>
      <div className="bg-white rounded-xl border shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Plus className="h-4 w-4" style={{ color: "#C9A84C" }} />
          <p className="font-semibold text-sm">{getLabel("newConv", lang)}</p>
        </div>

        {!isLoggedIn() && (
          <>
            <Input
              value={guestName}
              onChange={e => setGuestName(e.target.value)}
              placeholder={getLabel("yourName", lang)}
              className="text-sm h-9"
              data-testid="input-support-name"
            />
            <Input
              value={guestEmail}
              onChange={e => setGuestEmail(e.target.value)}
              placeholder={getLabel("yourEmail", lang)}
              type="email"
              className="text-sm h-9"
              data-testid="input-support-email"
            />
          </>
        )}

        <Input
          value={newSubject}
          onChange={e => setNewSubject(e.target.value)}
          placeholder={getLabel("subject", lang)}
          className="text-sm h-9"
          data-testid="input-support-subject"
        />
        <textarea
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          placeholder={getLabel("message", lang)}
          className="w-full border rounded-lg p-2.5 text-sm min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/30"
          data-testid="input-support-message"
        />
        <Button
          size="sm"
          className="w-full h-9 text-xs font-medium"
          style={{ backgroundColor: "#0A1628", color: "#C9A84C" }}
          onClick={startNewSupportConversation}
          disabled={!newSubject.trim() || !newMessage.trim() || supportLoading || (!isLoggedIn() && (!guestName.trim() || !guestEmail.trim()))}
          data-testid="button-start-support-chat"
        >
          {supportLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <>{getLabel("start", lang)}</>}
        </Button>
      </div>

      {supportConversations.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide px-1">{getLabel("history", lang)}</p>
          {supportConversations.map(conv => (
            <button
              key={conv.id}
              onClick={() => openSupportConversation(conv.id)}
              className="w-full text-left bg-white rounded-lg border shadow-sm p-3 hover:border-[#C9A84C]/40 transition-colors"
              data-testid={`support-conv-${conv.id}`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium truncate flex-1">{conv.subject}</p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  conv.status === "open" ? "bg-green-100 text-green-700" :
                  conv.status === "resolved" ? "bg-yellow-100 text-yellow-700" :
                  "bg-gray-100 text-gray-500"
                }`}>{conv.status}</span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{new Date(conv.lastMessageAt).toLocaleDateString()}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const renderSupportChat = () => {
    const conv = supportConversations.find(c => c.id === supportConvId);
    const isClosed = conv?.status === "closed";
    return (
      <>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background: "linear-gradient(to bottom, #f0f3f8, #fff)" }}>
          {supportMessages.map((msg) => (
            <div key={msg.id} className={`flex gap-2 ${msg.senderType === "customer" ? "justify-end" : "justify-start"}`}>
              {msg.senderType === "admin" && (
                <div className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-1" style={{ backgroundColor: "#0A162815" }}>
                  <Headset className="h-3.5 w-3.5" style={{ color: "#0A1628" }} />
                </div>
              )}
              <div
                className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
                  msg.senderType === "customer" ? "rounded-br-sm text-white" : "rounded-bl-sm text-gray-800 bg-white border shadow-sm"
                }`}
                style={msg.senderType === "customer" ? { background: "linear-gradient(135deg, #0A1628, #0D1520)" } : {}}
                data-testid={`support-msg-${msg.id}`}
              >
                {msg.content}
              </div>
              {msg.senderType === "customer" && (
                <div className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-1" style={{ backgroundColor: "#C9A84C20" }}>
                  <User className="h-3.5 w-3.5" style={{ color: "#C9A84C" }} />
                </div>
              )}
            </div>
          ))}

          {supportMessages.length > 0 && supportMessages[supportMessages.length - 1].senderType === "customer" && !supportLoading && (
            <div className="text-center">
              <p className="text-[11px] text-gray-400 animate-pulse">{getLabel("waiting", lang)}</p>
            </div>
          )}

          {conv?.status === "resolved" && (
            <div className="text-center bg-yellow-50 border border-yellow-200 rounded-lg p-2">
              <p className="text-xs text-yellow-700">{getLabel("resolved", lang)}</p>
            </div>
          )}
          {isClosed && (
            <div className="text-center bg-gray-50 border rounded-lg p-2">
              <p className="text-xs text-gray-500">{getLabel("closed", lang)}</p>
            </div>
          )}
        </div>
        {!isClosed && (
          <div className="p-3 border-t bg-white">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendSupportMessage()}
                placeholder={getLabel("message", lang)}
                className="rounded-full text-sm"
                disabled={supportLoading}
                data-testid="input-support-reply"
              />
              <Button
                size="sm"
                className="rounded-full h-9 w-9 p-0 shrink-0"
                style={{ backgroundColor: "#0A1628" }}
                onClick={sendSupportMessage}
                disabled={!input.trim() || supportLoading}
                data-testid="button-send-support"
              >
                <Send className="h-4 w-4 text-white" />
              </Button>
            </div>
          </div>
        )}
      </>
    );
  };

  const headerTitle = mode === "ai"
    ? { main: "LIMJIBA", sub: lang === "ar" ? "مساعد لمجيبة" : lang === "fr" ? "Assistant LIMJIBA" : "LIMJIBA Assistant" }
    : { main: getLabel("title", lang), sub: mode === "new-support" ? getLabel("newConv", lang) : (supportConversations.find(c => c.id === supportConvId)?.subject || "") };

  return (
    <>
      <div
        className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${open ? "scale-0 opacity-0" : "scale-100 opacity-100"}`}
      >
        <button
          onClick={() => setOpen(true)}
          className="h-14 w-14 rounded-full shadow-xl flex items-center justify-center hover:scale-110 transition-transform animate-bounce-slow"
          style={{ background: "linear-gradient(135deg, #0A1628, #0D1520)" }}
          data-testid="button-open-chat"
        >
          <MessageCircle className="h-6 w-6 text-white" />
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-[#C9A84C] animate-ping" />
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-[#C9A84C]" />
        </button>
      </div>

      <div className={`fixed bottom-6 right-6 z-50 transition-all duration-300 origin-bottom-right ${open ? "scale-100 opacity-100" : "scale-0 opacity-0 pointer-events-none"}`}>
        <div className="w-[360px] max-w-[calc(100vw-3rem)] h-[520px] max-h-[calc(100vh-6rem)] rounded-2xl shadow-2xl flex flex-col overflow-hidden border" style={{ background: "white" }}>
          <div className="px-4 py-3 flex items-center justify-between" style={{ background: "linear-gradient(135deg, #0A1628, #0D1520)" }}>
            <div className="flex items-center gap-2">
              {mode !== "ai" && (
                <button
                  onClick={switchToAi}
                  className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
                  data-testid="button-back-to-ai"
                >
                  <ArrowLeft className="h-4 w-4 text-white/70" />
                </button>
              )}
              {mode === "ai" ? (
                <img src={logoImg} alt="LIMJIBA" className="h-8 w-8 rounded-full object-contain bg-white/10 p-0.5" />
              ) : (
                <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(201,168,76,0.2)" }}>
                  <Headset className="h-4 w-4" style={{ color: "#C9A84C" }} />
                </div>
              )}
              <div>
                <p className="text-white font-semibold text-sm brand-name">{headerTitle.main}</p>
                <p className="text-white/60 text-xs truncate max-w-[180px]">{headerTitle.sub}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white/60 hover:text-white hover:bg-white/10 rounded-full" onClick={() => setOpen(false)} data-testid="button-close-chat">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {mode === "ai" && renderAiMode()}
          {mode === "new-support" && renderNewSupportForm()}
          {mode === "support" && renderSupportChat()}
        </div>
      </div>
    </>
  );
}
