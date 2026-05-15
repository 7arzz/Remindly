import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { X, Sparkles, Loader2, CheckCircle2, Circle, Pencil, Save, Brain } from "lucide-react";
import { useState, useEffect } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { toast } from "sonner";

export default function StepModal({ step, isOpen, onClose, onToggle, roadmapTitle, onUpdateDetail }) {
  const [aiDetail, setAiDetail] = useState(step.detail || "");
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [tempDetail, setTempDetail] = useState(step.detail || "");

  // Reset detail saat step ID berubah
  useEffect(() => {
    setAiDetail(step.detail || "");
    setTempDetail(step.detail || "");
    setIsEditing(false);
  }, [step.id]);

  const handleAskAI = async () => {
    setLoading(true);
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

      const prompt = `
        Saya sedang mengerjakan roadmap: "${roadmapTitle}"
        Sekarang saya berada di langkah: "${step.text}"
        
        Tolong berikan panduan singkat dan praktis (maksimal 3-4 poin) tentang cara menyelesaikan langkah ini dengan efektif. 
        Gunakan bahasa Indonesia yang santai tapi profesional. Berikan jawaban langsung ke poin-poinnya.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      setAiDetail(text);
      setTempDetail(text);
      onUpdateDetail(text); // Simpan otomatis hasil AI
      toast.success("AI telah memberikan panduan!");
    } catch (error) {
      console.error("AI Step Detail Error:", error);
      toast.error("Gagal mendapatkan panduan AI.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDetail = () => {
    onUpdateDetail(tempDetail);
    setAiDetail(tempDetail);
    setIsEditing(false);
  };

  return (
    <AnimatePresence>
      {isOpen && createPortal(
        <div className="fixed inset-0 z-[200] overflow-y-auto bg-black/60 backdrop-blur-sm custom-scrollbar" onClick={onClose}>
          <div className="flex min-h-full w-full justify-center items-start p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-bg-card border border-border-primary rounded-[24px] w-full max-w-lg shadow-2xl relative my-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 sm:p-8 flex flex-col gap-6">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-accent-primary">Step Details</span>
                    <h2 className="text-xl font-bold text-text-primary leading-tight">{step.text}</h2>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      className={`p-2 rounded-xl transition-all ${isEditing ? 'bg-accent-primary text-white' : 'bg-bg-secondary text-text-muted hover:text-accent-primary'}`}
                      onClick={() => setIsEditing(!isEditing)}
                      title="Edit Manual"
                    >
                      <Pencil size={18}/>
                    </button>
                    <button onClick={onClose} className="p-2 rounded-xl bg-bg-secondary text-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-all">
                      <X size={20}/>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                   <div className="bg-bg-secondary/30 rounded-2xl p-5 border border-border-primary/50 min-h-[120px] relative">
                      {isEditing ? (
                        <div className="flex flex-col gap-3 h-full">
                          <textarea 
                            value={tempDetail}
                            onChange={(e) => setTempDetail(e.target.value)}
                            className="w-full bg-transparent border-none text-sm text-text-primary focus:ring-0 resize-none min-h-[100px] custom-scrollbar"
                            placeholder="Tulis panduan atau catatan kamu di sini..."
                            autoFocus
                          />
                          <div className="flex justify-end gap-2 pt-2 border-t border-border-primary/20">
                            <button className="px-3 py-1.5 text-xs font-bold text-text-muted hover:text-text-primary" onClick={() => { setIsEditing(false); setTempDetail(aiDetail); }}>Cancel</button>
                            <button className="flex items-center gap-2 px-3 py-1.5 bg-accent-primary text-bg-primary rounded-lg text-xs font-bold" onClick={handleSaveDetail}>
                              <Save size={12}/> Save Guide
                            </button>
                          </div>
                        </div>
                      ) : aiDetail ? (
                        <div className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap fadeIn">
                          {aiDetail}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-3 py-4 opacity-50">
                          <Sparkles size={24} className="text-accent-primary" />
                          <p className="text-xs font-medium">Belum ada panduan. Gunakan AI atau tulis sendiri!</p>
                        </div>
                      )}
                   </div>

                   {!isEditing && (
                     <button 
                      onClick={handleAskAI}
                      disabled={loading}
                      className="btn-primary w-full py-3.5 bg-gradient-to-r from-accent-primary to-cyan-500 shadow-lg shadow-accent-primary/20"
                     >
                       {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                       <span>{loading ? "Menyusun Panduan..." : "Tanya Panduan AI"}</span>
                     </button>
                   )}
                </div>

                <div className="pt-4 border-t border-border-primary/30 flex justify-between items-center">
                   <button 
                    onClick={() => { onToggle(); onClose(); }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                      step.done ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-bg-secondary text-text-muted'
                    }`}
                   >
                     {step.done ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                     {step.done ? "Completed" : "Mark as Done"}
                   </button>
                   <span className="text-[10px] font-medium text-text-muted uppercase tracking-widest line-clamp-1">Map: {roadmapTitle}</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>,
        document.body
      )}
    </AnimatePresence>
  );
}
