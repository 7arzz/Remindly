import { useState } from "react";
import { Send, Trash2, User as UserIcon, X, Loader2 } from "lucide-react";

function Answer({ answers = [], onAddAnswer, onDeleteAnswer, currentUser }) {
  const [newAnswer, setNewAnswer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAdd = async () => {
    if (!newAnswer.trim()) return;
    setIsSubmitting(true);
    try {
      await onAddAnswer(newAnswer);
      setNewAnswer("");
    } catch (error) {
      console.error("Error adding answer:", error);
      alert("Failed to post answer. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 pt-6 border-t border-border-primary/50">
      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-accent-primary/60">
        Collaborative Discussion
      </h3>
      
      <div className="bg-bg-secondary/30 border border-border-primary/50 rounded-2xl p-4 sm:p-5 flex flex-col gap-4 shadow-inner">
        <textarea
          value={newAnswer}
          onChange={(e) => setNewAnswer(e.target.value)}
          placeholder="Share your answer or notes with everyone..."
          className="w-full bg-transparent border-none text-text-primary placeholder:text-text-muted text-sm sm:text-base focus:ring-0 resize-none min-h-[80px]"
          disabled={isSubmitting}
        />
        
        <div className="flex justify-end items-center gap-3 pt-3 border-t border-border-primary/20">
          <button 
            className={`btn-primary py-2.5 px-5 text-sm ${isSubmitting || !newAnswer.trim() ? 'opacity-50 grayscale scale-100 cursor-not-allowed' : ''}`}
            onClick={handleAdd} 
            disabled={isSubmitting || !newAnswer.trim()}
          >
            {isSubmitting ? (
              <><Loader2 className="animate-spin" size={16} /> <span>Posting...</span></>
            ) : (
              <><Send size={16} /> <span>Submit Answer</span></>
            )}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4 mt-2">
        {answers.length === 0 ? (
          <div className="py-12 flex flex-col items-center gap-3 opacity-30 grayscale">
             <Send size={40} className="text-text-muted" />
             <p className="text-xs font-black uppercase tracking-widest text-text-muted text-center">No answers yet. Be the first to help!</p>
          </div>
        ) : (
          answers.map((ans) => {
            const userNameVal = ans.userName || ans.user_name || "User";
            const userEmailVal = ans.userEmail || ans.user_email || "";
            const createdAtVal = ans.createdAt || ans.created_at || new Date().toISOString();
            
            return (
              <div key={ans.id} className="group relative bg-bg-card/40 border border-border-primary/40 rounded-2xl p-5 hover:border-accent-primary/30 transition-all">
                <div className="flex items-center gap-2 text-xs font-bold text-accent-primary mb-3">
                  <div className="w-5 h-5 rounded-full bg-accent-primary/20 flex items-center justify-center">
                    <UserIcon size={10} />
                  </div>
                  <span>{userNameVal}</span>
                </div>
                
                <div className="text-text-primary text-sm sm:text-base leading-relaxed whitespace-pre-wrap mb-4">
                  {ans.text}
                </div>

                <div className="flex justify-between items-center mt-2">
                  <div className="text-[10px] font-medium text-text-muted uppercase tracking-widest">
                    {new Date(createdAtVal).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  
                  {userEmailVal === currentUser.email && (
                    <button
                      className="p-1.5 rounded-lg text-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100"
                      onClick={() => onDeleteAnswer(ans.id)}
                      title="Delete your answer"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default Answer;
