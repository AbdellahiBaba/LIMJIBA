import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, X, Send, Loader2, Bot, User } from "lucide-react";
import { useStoreLanguage } from "@/components/store-layout";
import logoImg from "@assets/WhatsApp_Image_2026-03-09_at_20.11.18_1773113178753.jpeg";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const QUICK_ACTIONS: Record<string, { en: string; fr: string; ar: string }[]> = {
  chips: [
    { en: "🔥 Best Sellers", fr: "🔥 Meilleures ventes", ar: "🔥 الأكثر مبيعاً" },
    { en: "🏷️ Promotions", fr: "🏷️ Promotions", ar: "🏷️ العروض" },
    { en: "📦 Track My Order", fr: "📦 Suivre ma commande", ar: "📦 تتبع طلبي" },
    { en: "💰 Payment Status", fr: "💰 État du paiement", ar: "💰 حالة الدفع" },
    { en: "📞 Contact Us", fr: "📞 Contactez-nous", ar: "📞 اتصل بنا" },
  ],
};

export default function LimjibaChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [greeted, setGreeted] = useState(false);
  const [showChips, setShowChips] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { lang } = useStoreLanguage();

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
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const userMsg = (text || input).trim();
    if (!userMsg || loading) return;
    if (!text) setInput("");
    setShowChips(false);
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

  const chipLabel = (chip: { en: string; fr: string; ar: string }) => {
    return chip[lang] || chip.en;
  };

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
        <div className="w-[360px] max-w-[calc(100vw-3rem)] h-[500px] max-h-[calc(100vh-6rem)] rounded-2xl shadow-2xl flex flex-col overflow-hidden border" style={{ background: "white" }}>
          <div className="px-4 py-3 flex items-center justify-between" style={{ background: "linear-gradient(135deg, #0A1628, #0D1520)" }}>
            <div className="flex items-center gap-2">
              <img src={logoImg} alt="LIMJIBA" className="h-8 w-8 rounded-full object-contain bg-white/10 p-0.5" />
              <div>
                <p className="text-white font-semibold text-sm brand-name">LIMJIBA</p>
                <p className="text-white/60 text-xs brand-name-ar">مساعد لمجيبة</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white/60 hover:text-white hover:bg-white/10 rounded-full" onClick={() => setOpen(false)} data-testid="button-close-chat">
              <X className="h-4 w-4" />
            </Button>
          </div>

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
                    msg.role === "user"
                      ? "rounded-br-sm text-white"
                      : "rounded-bl-sm text-gray-800 bg-white border shadow-sm"
                  }`}
                  style={msg.role === "user" ? { background: "linear-gradient(135deg, #0A1628, #0D1520)" } : {}}
                  data-testid={`chat-msg-${i}`}
                >
                  {msg.content}
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
                    onClick={() => sendMessage(chipLabel(chip))}
                    className="px-3 py-1.5 rounded-full text-xs font-medium border border-[#0A1628]/20 bg-white hover:bg-[#0A1628]/5 text-[#0A1628] transition-colors shadow-sm whitespace-nowrap"
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
                onKeyDown={e => e.key === "Enter" && sendMessage()}
                placeholder={lang === "ar" ? "اسأل عن المنتجات، الطلبات..." : lang === "fr" ? "Posez vos questions..." : "Ask about products, orders..."}
                className="rounded-full text-sm"
                disabled={loading}
                data-testid="input-chat-message"
              />
              <Button
                size="sm"
                className="rounded-full h-9 w-9 p-0 shrink-0"
                style={{ backgroundColor: "#0A1628" }}
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                data-testid="button-send-chat"
              >
                <Send className="h-4 w-4 text-white" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
