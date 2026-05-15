import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { X, Send, Sparkles, Loader2, Bot, User, Brain } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";

export default function SummaryChatModal({ summary, isOpen, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (isOpen && summary) {
      setMessages([
        { role: 'ai', text: `Halo! Saya AI asisten kamu. Ada yang ingin ditanyakan tentang catatan "${summary.title}" ini?` }
      ]);
    }
  }, [isOpen, summary]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setInput("");
    setLoading(true);

    try {
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

      const chat = model.startChat({
        history: [
          {
            role: "user",
            parts: [{ text: `Konteks Catatan saya: ${summary.content}` }],
          },
          {
            role: "model",
            parts: [{ text: "Baik, saya sudah memahami konteks catatan Anda. Silakan tanyakan apa saja terkait catatan tersebut." }],
          },
        ],
      });

      const result = await chat.sendMessage(userMessage);
      const response = await result.response;
      setMessages(prev => [...prev, { role: 'ai', text: response.text() }]);
    } catch (error) {
      console.error("AI Chat Error:", error);
      setMessages(prev => [...prev, { role: 'ai', text: "Maaf, sepertinya ada masalah koneksi. Coba lagi ya." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && summary && createPortal(
        <div className="fixed inset-0 z-[200] overflow-y-auto bg-black/60 backdrop-blur-md custom-scrollbar" onClick={onClose}>
          <div className="flex min-h-full w-full justify-center items-start p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-bg-card border border-border-primary rounded-[28px] w-full max-w-lg h-[600px] flex flex-col shadow-2xl relative my-auto"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-5 border-b border-border-primary/50 flex justify-between items-center bg-bg-secondary/20">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-accent-primary/10 text-accent-primary rounded-xl">
                    <Brain size={20} />
                  </div>
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-widest text-text-primary">Chat with AI</h2>
                    <p className="text-[10px] text-text-muted font-bold tracking-tight truncate max-w-[200px]">Re: {summary.title}</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 rounded-xl text-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-all">
                  <X size={20} />
                </button>
              </div>

              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar bg-bg-primary/30">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        msg.role === 'user' ? 'bg-bg-secondary text-text-muted' : 'bg-accent-primary text-white'
                      }`}>
                        {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                      </div>
                      <div className={`p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                        msg.role === 'user' 
                        ? 'bg-bg-secondary text-text-primary rounded-tr-none' 
                        : 'bg-bg-card border border-border-primary rounded-tl-none text-text-primary'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start animate-pulse">
                    <div className="flex gap-3 max-w-[85%] items-start">
                      <div className="w-8 h-8 rounded-xl bg-accent-primary/20 flex items-center justify-center">
                        <Loader2 size={14} className="text-accent-primary animate-spin" />
                      </div>
                      <div className="p-4 rounded-2xl bg-bg-card border border-border-primary rounded-tl-none h-12 w-32" />
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <form onSubmit={handleSend} className="p-4 border-t border-border-primary/50 flex gap-3 bg-bg-secondary/20">
                <input 
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Tanyakan detail catatan..."
                  className="flex-1 bg-bg-primary/50 border border-border-primary/50 rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary focus:bg-bg-primary transition-all"
                  disabled={loading}
                />
                <button 
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="p-3 bg-accent-primary text-white rounded-xl hover:bg-accent-primary/90 transition-all disabled:opacity-50 disabled:grayscale"
                >
                  <Send size={18} />
                </button>
              </form>
            </motion.div>
          </div>
        </div>,
        document.body
      )}
    </AnimatePresence>
  );
}
