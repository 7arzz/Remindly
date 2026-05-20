import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import {
  X,
  Send,
  Loader2,
  Bot,
  User,
  Brain,
  Sparkles,
  FileText,
  ChevronDown,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Renders AI text with basic markdown: **bold**, bullet lines
function AiText({ text }) {
  if (!text) return null;
  const lines = text.split("\n");
  return (
    <div className="flex flex-col gap-1">
      {lines.map((line, i) => {
        const isBullet = /^[\u2022\-\*]\s/.test(line.trim());
        const formatted = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
        return (
          <p
            key={i}
            className={`text-sm leading-relaxed ${isBullet ? "pl-3" : ""}`}
            dangerouslySetInnerHTML={{ __html: formatted }}
          />
        );
      })}
    </div>
  );
}

// Auto-summary card shown at the top of the chat
function SummaryCard({ summary, imageContext }) {
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [summaryText, setSummaryText] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const hasRun = useRef(false);

  useEffect(() => {
    if (!summary || hasRun.current) return;
    hasRun.current = true;

    const run = async () => {
      setStatus("loading");
      try {
        const genAI = new GoogleGenerativeAI(
          import.meta.env.VITE_GEMINI_API_KEY,
        );
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        const prompt = `Kamu adalah asisten ringkas dan cerdas. Berikan ringkasan singkat namun informatif dari catatan berikut dalam bahasa Indonesia. Gunakan format:
📌 **Ringkasan Utama:** [1-2 kalimat inti]
🔑 **Poin Penting:**
• [poin 1]
• [poin 2]
• [poin 3 jika ada]
💡 **Kesimpulan:** [1 kalimat penutup]

Judul catatan: "${summary.title}"
Isi catatan: "${summary.content}"`;

        const parts = [{ text: prompt }];

        // Include image if available
        if (imageContext) {
          parts.push({
            inlineData: {
              data: imageContext.data,
              mimeType: imageContext.mimeType,
            },
          });
        }

        const result = await model.generateContent(parts);
        const response = await result.response;
        setSummaryText(response.text());
        setStatus("done");
      } catch (err) {
        console.error("Auto-summary error:", err);
        setStatus("error");
      }
    };

    run();
  }, [summary, imageContext]);

  return (
    <div className="mx-5 mt-5 rounded-2xl border border-accent-primary/20 bg-accent-primary/5 overflow-hidden shadow-sm">
      {/* Card header */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent-primary/10 transition-colors"
        disabled={status === "loading"}
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-accent-primary/15 rounded-lg text-accent-primary">
            <Sparkles size={14} />
          </div>
          <span className="text-xs font-black uppercase tracking-widest text-accent-primary">
            Ringkasan AI
          </span>
          {status === "loading" && (
            <Loader2 size={12} className="animate-spin text-accent-primary/60" />
          )}
          {status === "done" && (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              Selesai
            </span>
          )}
        </div>
        {status !== "loading" && (
          <ChevronDown
            size={16}
            className={`text-accent-primary/60 transition-transform duration-300 ${collapsed ? "-rotate-90" : ""}`}
          />
        )}
      </button>

      {/* Card body */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-accent-primary/10">
              {status === "loading" && (
                <div className="flex flex-col gap-2 mt-2">
                  {[80, 60, 90, 50].map((w, i) => (
                    <div
                      key={i}
                      className="h-3 rounded-full bg-accent-primary/10 animate-pulse"
                      style={{ width: `${w}%` }}
                    />
                  ))}
                </div>
              )}
              {status === "done" && (
                <div className="mt-1 text-text-secondary leading-relaxed">
                  <AiText text={summaryText} />
                </div>
              )}
              {status === "error" && (
                <p className="text-xs text-rose-400 mt-2 font-medium">
                  Gagal membuat ringkasan. Coba muat ulang.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SummaryChatModal({ summary, isOpen, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [imageContext, setImageContext] = useState(null);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // Reset state when modal opens with a new summary
  useEffect(() => {
    if (isOpen && summary) {
      setMessages([
        {
          role: "ai",
          text: `Halo! ✨ Saya sudah membacakan catatan **"${summary.title}"** untuk kamu. Lihat ringkasan di atas, lalu tanyakan apa saja!`,
        },
      ]);
      setInput("");

      if (summary.image_url) {
        setIsImageLoading(true);
        fetch(summary.image_url)
          .then((res) => res.blob())
          .then((blob) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              setImageContext({
                data: reader.result.split(",")[1],
                mimeType: blob.type || "image/jpeg",
              });
              setIsImageLoading(false);
            };
            reader.readAsDataURL(blob);
          })
          .catch((err) => {
            console.error("Failed to load summary image for AI context:", err);
            setIsImageLoading(false);
          });
      } else {
        setImageContext(null);
      }
    }
  }, [isOpen, summary]);

  // Auto-scroll messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when ready
  useEffect(() => {
    if (isOpen && !loading && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, loading]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    setInput("");
    setLoading(true);

    try {
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

      const contextParts = [
        { text: `Konteks Catatan: Judul: "${summary.title}". Isi: "${summary.content}"` },
      ];
      if (imageContext) {
        contextParts.push({
          inlineData: {
            data: imageContext.data,
            mimeType: imageContext.mimeType,
          },
        });
      }

      const chat = model.startChat({
        history: [
          { role: "user", parts: contextParts },
          {
            role: "model",
            parts: [
              {
                text: "Baik, saya sudah memahami konteks catatan dan lampiran Anda. Silakan tanyakan apa saja.",
              },
            ],
          },
        ],
      });

      const result = await chat.sendMessage(userMessage);
      const response = await result.response;
      setMessages((prev) => [...prev, { role: "ai", text: response.text() }]);
    } catch (error) {
      console.error("AI Chat Error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "Maaf, ada masalah saat menghubungi AI. Coba lagi ya." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen &&
        summary &&
        createPortal(
          <div
            className="fixed inset-0 z-[200] overflow-y-auto bg-black/60 backdrop-blur-md custom-scrollbar"
            onClick={onClose}
          >
            <div className="flex min-h-full w-full justify-center items-start p-4 sm:p-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 24 }}
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
                className="bg-bg-card border border-border-primary rounded-[28px] w-full max-w-lg flex flex-col shadow-2xl relative my-auto overflow-hidden"
                style={{ maxHeight: "90vh" }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* ── Header ── */}
                <div className="flex-shrink-0 px-5 py-4 border-b border-border-primary/50 flex justify-between items-center bg-bg-secondary/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-accent-primary/10 text-accent-primary rounded-xl">
                      <Brain size={18} />
                    </div>
                    <div>
                      <h2 className="text-sm font-black uppercase tracking-widest text-text-primary">
                        Tanya AI
                      </h2>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <FileText size={10} className="text-text-muted" />
                        <p className="text-[10px] text-text-muted font-bold tracking-tight truncate max-w-[160px]">
                          {summary.title}
                        </p>
                        {isImageLoading ? (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            <Loader2 size={7} className="animate-spin" />
                            Lampiran…
                          </span>
                        ) : imageContext ? (
                          <span className="px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            + Lampiran
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-xl text-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* ── Scrollable Area (summary card + messages) ── */}
                <div
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto custom-scrollbar bg-bg-primary/30"
                  style={{ minHeight: 0 }}
                >
                  {/* Auto-summary card */}
                  <SummaryCard summary={summary} imageContext={imageContext} />

                  {/* Chat messages */}
                  <div className="p-5 space-y-4">
                    {messages.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`flex gap-2.5 max-w-[88%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                        >
                          <div
                            className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                              msg.role === "user"
                                ? "bg-bg-secondary text-text-muted"
                                : "bg-accent-primary text-white"
                            }`}
                          >
                            {msg.role === "user" ? (
                              <User size={13} />
                            ) : (
                              <Bot size={13} />
                            )}
                          </div>
                          <div
                            className={`px-4 py-3 rounded-2xl shadow-sm ${
                              msg.role === "user"
                                ? "bg-bg-secondary text-text-primary rounded-tr-none"
                                : "bg-bg-card border border-border-primary rounded-tl-none text-text-primary"
                            }`}
                          >
                            <AiText text={msg.text} />
                          </div>
                        </div>
                      </div>
                    ))}

                    {loading && (
                      <div className="flex justify-start">
                        <div className="flex gap-2.5 items-start">
                          <div className="w-7 h-7 rounded-xl bg-accent-primary flex items-center justify-center">
                            <Loader2 size={13} className="text-white animate-spin" />
                          </div>
                          <div className="px-4 py-3 rounded-2xl bg-bg-card border border-border-primary rounded-tl-none flex gap-1.5 items-center">
                            {[0, 0.15, 0.3].map((delay, i) => (
                              <span
                                key={i}
                                className="w-1.5 h-1.5 rounded-full bg-accent-primary/50 animate-bounce"
                                style={{ animationDelay: `${delay}s` }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Input ── */}
                <form
                  onSubmit={handleSend}
                  className="flex-shrink-0 p-4 border-t border-border-primary/50 flex gap-3 bg-bg-secondary/20"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Tanyakan sesuatu tentang catatan ini…"
                    className="flex-1 bg-bg-primary/50 border border-border-primary/50 rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary focus:bg-bg-primary transition-all"
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || loading}
                    className="p-3 bg-accent-primary text-white rounded-xl hover:bg-accent-primary/90 transition-all disabled:opacity-40 disabled:grayscale active:scale-95"
                  >
                    <Send size={18} />
                  </button>
                </form>
              </motion.div>
            </div>
          </div>,
          document.body,
        )}
    </AnimatePresence>
  );
}
