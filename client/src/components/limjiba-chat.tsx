import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, X, Send, Loader2, Bot, User } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function LimjibaChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [greeted, setGreeted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && !greeted) {
      setGreeted(true);
      setMessages([{ role: "assistant", content: "Welcome to our store! 👋 I'm Limjiba, your shopping assistant. How can I help you today?" }]);
    }
  }, [open, greeted]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    const updatedMessages = [...messages, { role: "user" as const, content: userMsg }];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      const res = await fetch("/api/store/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, history: updatedMessages.slice(-10) }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.response || "Sorry, I couldn't process that." }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I'm having trouble connecting. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div
        className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${open ? "scale-0 opacity-0" : "scale-100 opacity-100"}`}
      >
        <button
          onClick={() => setOpen(true)}
          className="h-14 w-14 rounded-full shadow-xl flex items-center justify-center hover:scale-110 transition-transform animate-bounce-slow"
          style={{ background: "linear-gradient(135deg, #4A0E4E, #1A0A2E)" }}
          data-testid="button-open-chat"
        >
          <MessageCircle className="h-6 w-6 text-white" />
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-[#D4AF37] animate-ping" />
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-[#D4AF37]" />
        </button>
      </div>

      <div className={`fixed bottom-6 right-6 z-50 transition-all duration-300 origin-bottom-right ${open ? "scale-100 opacity-100" : "scale-0 opacity-0 pointer-events-none"}`}>
        <div className="w-[360px] h-[500px] rounded-2xl shadow-2xl flex flex-col overflow-hidden border" style={{ background: "white" }}>
          <div className="px-4 py-3 flex items-center justify-between" style={{ background: "linear-gradient(135deg, #4A0E4E, #1A0A2E)" }}>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full flex items-center justify-center" style={{ backgroundColor: "#D4AF3730" }}>
                <Bot className="h-4 w-4" style={{ color: "#D4AF37" }} />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Limjiba Agent</p>
                <p className="text-white/60 text-xs">Your shopping assistant</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white/60 hover:text-white hover:bg-white/10 rounded-full" onClick={() => setOpen(false)} data-testid="button-close-chat">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background: "linear-gradient(to bottom, #f8f6ff, #fff)" }}>
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-1" style={{ backgroundColor: "#4A0E4E15" }}>
                    <Bot className="h-3.5 w-3.5" style={{ color: "#4A0E4E" }} />
                  </div>
                )}
                <div
                  className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "rounded-br-sm text-white"
                      : "rounded-bl-sm text-gray-800 bg-white border shadow-sm"
                  }`}
                  style={msg.role === "user" ? { background: "linear-gradient(135deg, #4A0E4E, #6B1D70)" } : {}}
                  data-testid={`chat-msg-${i}`}
                >
                  {msg.content}
                </div>
                {msg.role === "user" && (
                  <div className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-1" style={{ backgroundColor: "#D4AF3720" }}>
                    <User className="h-3.5 w-3.5" style={{ color: "#D4AF37" }} />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <div className="h-7 w-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: "#4A0E4E15" }}>
                  <Bot className="h-3.5 w-3.5" style={{ color: "#4A0E4E" }} />
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
                placeholder="Ask about products..."
                className="rounded-full text-sm"
                disabled={loading}
                data-testid="input-chat-message"
              />
              <Button
                size="sm"
                className="rounded-full h-9 w-9 p-0 shrink-0"
                style={{ backgroundColor: "#4A0E4E" }}
                onClick={sendMessage}
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
