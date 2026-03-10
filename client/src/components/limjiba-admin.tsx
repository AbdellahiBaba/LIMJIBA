import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Loader2, Bot, User, Sparkles, TrendingUp, Package, Tag } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const QUICK_ACTIONS = [
  { label: "Best Sellers", prompt: "What are the top selling products?", icon: TrendingUp },
  { label: "Restock Alerts", prompt: "Which products need restocking?", icon: Package },
  { label: "Generate Promo", prompt: "Generate a promo code with a safe discount", icon: Tag },
  { label: "Sales Overview", prompt: "Give me a sales overview and insights", icon: Sparkles },
];

export default function LimjibaAdmin() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hello! I'm LEMJIBA, your business assistant. I can help you with:\n\n• Sales analysis & best sellers\n• Stock alerts & restock suggestions\n• Promo code generation\n• Business insights\n\nWhat would you like to know?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    if (!text) setInput("");
    const updatedMessages = [...messages, { role: "user" as const, content: msg }];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, history: updatedMessages.slice(-10) }),
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
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-limjiba-admin-title">
          <Bot className="h-7 w-7 text-blue-700" />
          LEMJIBA Agent
        </h1>
        <p className="text-sm text-muted-foreground mt-1">AI-powered business assistant for your store</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {QUICK_ACTIONS.map(action => (
          <Button
            key={action.label}
            variant="outline"
            className="h-auto py-3 flex flex-col items-center gap-1 text-xs hover:bg-blue-50 hover:border-blue-200"
            onClick={() => sendMessage(action.prompt)}
            disabled={loading}
            data-testid={`button-quick-${action.label.toLowerCase().replace(/\s/g, "-")}`}
          >
            <action.icon className="h-4 w-4 text-blue-600" />
            {action.label}
          </Button>
        ))}
      </div>

      <Card className="h-[calc(100vh-320px)] min-h-[400px] flex flex-col">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-sm flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            LEMJIBA is online
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
                {msg.role === "assistant" && (
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="h-4 w-4 text-blue-700" />
                  </div>
                )}
                <div className={`max-w-[80%] px-4 py-3 rounded-xl text-sm whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-blue-700 text-white rounded-br-sm"
                    : "bg-muted rounded-bl-sm"
                }`} data-testid={`admin-chat-msg-${i}`}>
                  {msg.content}
                </div>
                {msg.role === "user" && (
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-blue-700" />
                </div>
                <div className="bg-muted rounded-xl rounded-bl-sm px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                </div>
              </div>
            )}
          </div>
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendMessage()}
                placeholder="Ask LEMJIBA about your business..."
                disabled={loading}
                data-testid="input-admin-chat"
              />
              <Button onClick={() => sendMessage()} disabled={!input.trim() || loading} data-testid="button-admin-send">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
