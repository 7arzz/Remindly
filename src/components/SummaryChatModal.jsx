import { motion, AnimatePresence } from "framer-motion";
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

  if (!isOpen || !summary) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-center justify-center p-4" onClick={onClose}>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-bg-card border border-border-primary rounded-[28px] w-full max-w-lg h-[600px] flex flex-col overflow-hidden shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-5 border-b border-border-primary/50 flex justify-between items-center bg-bg-secondary/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent-primary/10 rounded-xl text-accent-primary">
                <Brain size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-accent-primary">AI Clarifier</span>
                <h2 className="text-sm font-bold text-text-primary line-clamp-1">{summary.title}</h2>
              </div>
            </div>
            <button className="p-2 rounded-xl bg-bg-secondary text-text-muted hover:text-rose-400 transition-all" onClick={onClose}>
              <X size={20}/>
            </button>
          </div>

          {/* Chat Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 custom-scrollbar bg-bg-primary/30">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-accent-primary text-white' : 'bg-bg-secondary text-accent-primary'}`}>
                    {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                  </div>
                  <div className={`p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user' 
                      ? 'bg-accent-primary text-white rounded-tr-none shadow-lg shadow-accent-primary/10' 
                      : 'bg-bg-secondary text-text-secondary rounded-tl-none border border-border-primary/50'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-bg-secondary text-accent-primary flex items-center justify-center animate-pulse">
                    <Bot size={14} />
                  </div>
                  <div className="bg-bg-secondary/50 p-4 rounded-2xl rounded-tl-none border border-border-primary/50 flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin text-accent-primary" />
                    <span className="text-xs font-medium text-text-muted">AI sedang berpikir...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} className="p-5 border-t border-border-primary/50 bg-bg-secondary/20 flex gap-3">
            <input 
              type="text" 
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Tanyakan sesuatu tentang catatan ini..."
              className="flex-1 bg-bg-primary border border-border-primary/50 rounded-xl px-4 py-3 text-sm text-text-primary focus:outline-none focus:border-accent-primary transition-all"
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
    </AnimatePresence>
  );
}
