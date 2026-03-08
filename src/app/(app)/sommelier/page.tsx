"use client";

import { useState, useRef, useEffect } from "react";
import {
  Loader2,
  Send,
  Wine,
  MapPin,
  Sparkles,
  ArrowLeft,
  RotateCcw,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const QUICK_PROMPTS = [
  { label: "今日のおすすめ", prompt: "今の気分に合うウイスキーを1本おすすめして" },
  { label: "バーの頼み方", prompt: "バーで初めてウイスキーを頼むときのコツを教えて" },
  { label: "好みを分析", prompt: "私の好みの傾向を分析して、次に挑戦すべきウイスキーを教えて" },
  { label: "ペアリング", prompt: "ウイスキーに合うおつまみやフードペアリングを教えて" },
];

export default function SommelierPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number; area: string } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMessage: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text.trim(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/sommelier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          location,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const assistantMessage: Message = {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: data.reply,
        };
        setMessages([...newMessages, assistantMessage]);
      } else {
        const err = await res.json();
        const errorMessage: Message = {
          id: `e-${Date.now()}`,
          role: "assistant",
          content: err.error || "申し訳ございません、一時的にお答えできません。もう一度お試しください。",
        };
        setMessages([...newMessages, errorMessage]);
      }
    } catch {
      const errorMessage: Message = {
        id: `e-${Date.now()}`,
        role: "assistant",
        content: "通信エラーが発生しました。もう一度お試しください。",
      };
      setMessages([...newMessages, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleShareLocation = () => {
    if (!navigator.geolocation) return;
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        // Reverse geocode to get area name
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14&addressdetails=1`,
            { headers: { "Accept-Language": "ja" } }
          );
          const data = await res.json();
          const area =
            data.address?.city ||
            data.address?.town ||
            data.address?.village ||
            data.address?.suburb ||
            data.display_name?.split(",")[0] ||
            "不明";
          setLocation({ lat: latitude, lng: longitude, area });
        } catch {
          setLocation({ lat: latitude, lng: longitude, area: "位置情報取得済み" });
        }
        setLocationLoading(false);
      },
      () => {
        setLocationLoading(false);
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  };

  const resetChat = () => {
    setMessages([]);
    setInput("");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between py-2">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-whiskey-muted hover:text-whiskey-text text-sm"
        >
          <ArrowLeft size={16} />
          戻る
        </button>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={resetChat}
              className="flex items-center gap-1 text-whiskey-muted hover:text-whiskey-text text-xs glass-tag px-2.5 py-1"
            >
              <RotateCcw size={12} />
              リセット
            </button>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-2">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-5 animate-fadeInScale">
            {/* Sommelier Avatar */}
            <div className="w-20 h-20 rounded-full glass-card-gold flex items-center justify-center animate-pulse-glow">
              <Wine size={32} className="text-whiskey-gold" />
            </div>
            <div className="text-center space-y-2">
              <h1 className="text-lg font-bold text-whiskey-gold">
                🥃 ノミタイソムリエ
              </h1>
              <p className="text-sm text-whiskey-muted leading-relaxed max-w-[280px]">
                あなた専属のAIウイスキーソムリエです。
                おすすめの銘柄、バー、飲み方など何でもお聞きください。
              </p>
            </div>

            {/* Location Button */}
            <button
              onClick={handleShareLocation}
              disabled={locationLoading || !!location}
              className={`flex items-center gap-2 glass-tag px-4 py-2 text-xs font-bold ${
                location ? "text-green-400 border-green-400/30" : "text-whiskey-gold"
              }`}
            >
              {locationLoading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <MapPin size={14} />
              )}
              {location
                ? `📍 ${location.area}`
                : "位置情報を共有してバーをおすすめ"}
            </button>

            {/* Quick Prompts */}
            <div className="w-full space-y-2 px-2">
              <p className="text-[10px] text-whiskey-muted text-center">
                タップして聞いてみよう
              </p>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_PROMPTS.map((q) => (
                  <button
                    key={q.label}
                    onClick={() => sendMessage(q.prompt)}
                    className="glass-card p-3 text-left active:scale-[0.97]"
                  >
                    <p className="text-xs font-bold text-whiskey-gold">
                      {q.label}
                    </p>
                    <p className="text-[10px] text-whiskey-muted mt-0.5 line-clamp-1">
                      {q.prompt}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 stagger-children">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full glass-card-gold flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                    <Wine size={14} className="text-whiskey-gold" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-whiskey-gold/20 text-whiskey-text rounded-br-md"
                      : "glass-card !rounded-bl-md"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="w-8 h-8 rounded-full glass-card-gold flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                  <Wine size={14} className="text-whiskey-gold" />
                </div>
                <div className="glass-card px-4 py-3 rounded-2xl !rounded-bl-md">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-whiskey-gold/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 bg-whiskey-gold/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 bg-whiskey-gold/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Location bar (when in chat) */}
      {messages.length > 0 && !location && (
        <button
          onClick={handleShareLocation}
          disabled={locationLoading}
          className="flex items-center justify-center gap-1.5 py-1.5 text-[10px] text-whiskey-muted hover:text-whiskey-gold transition-colors"
        >
          {locationLoading ? <Loader2 size={10} className="animate-spin" /> : <MapPin size={10} />}
          位置情報を共有するとバーのおすすめも可能に
        </button>
      )}
      {messages.length > 0 && location && (
        <div className="flex items-center justify-center gap-1.5 py-1 text-[10px] text-green-400/70">
          <MapPin size={10} />
          {location.area}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 pt-2 pb-1">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="ソムリエに聞いてみよう..."
          className="flex-1 glass-input rounded-full px-4 py-3 text-sm text-whiskey-text placeholder:text-whiskey-muted/50"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !(e.nativeEvent as KeyboardEvent).isComposing) {
              sendMessage(input);
            }
          }}
          disabled={loading}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || loading}
          className="w-12 h-12 rounded-full glass-button text-whiskey-bg flex items-center justify-center disabled:opacity-30 active:scale-90"
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Send size={18} />
          )}
        </button>
      </div>
    </div>
  );
}
