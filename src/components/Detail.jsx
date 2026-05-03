import { motion as Motion, AnimatePresence } from "framer-motion";
import { X, BookOpen, Clock, AlertCircle, FileText, User as UserIcon, Trash2 } from "lucide-react";
import Answer from "./Answer";
import { db } from "../firebase";

function Detail({ task, onClose, updateTask, currentUser, onDelete }) {
  if (!task) return null;

  const isAssignment = task.isAssignment || false;

  const handleToggleAssignment = () => {
    updateTask(task.id, { isAssignment: !isAssignment });
  };

  const handleAddAnswer = async (text) => {
    const newAnswer = {
      id: Date.now(),
      text,
      userName: currentUser.displayName || currentUser.email.split('@')[0],
      userEmail: currentUser.email,
      createdAt: new Date().toISOString(),
    };
    const currentAnswers = task.answers || [];
    updateTask(task.id, { answers: [...currentAnswers, newAnswer] });
  };

  const handleDeleteAnswer = (answerId) => {
    const currentAnswers = task.answers || [];
    updateTask(task.id, {
      answers: currentAnswers.filter((a) => a.id !== answerId),
    });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
        <Motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-bg-card border border-border-primary rounded-[32px] w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl relative flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 sm:p-8 flex flex-col gap-6">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <h2 className="text-2xl sm:text-3xl font-black text-text-primary leading-tight mb-3">
                  {task.text}
                </h2>
                <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm font-medium">
                  <div className="flex items-center gap-2 text-text-secondary bg-bg-secondary/50 px-3 py-1.5 rounded-full border border-border-primary/50">
                    <Clock size={16} className="text-accent-primary" />
                    <span>
                      {new Date(task.time).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-text-secondary bg-bg-secondary/50 px-3 py-1.5 rounded-full border border-border-primary/50 capitalize">
                    <AlertCircle size={16} className="text-amber-400" />
                    <span>Priority: {task.priority}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4 text-text-muted text-xs font-bold uppercase tracking-wider">
                  <div className="w-6 h-6 rounded-full bg-accent-primary/20 flex items-center justify-center text-accent-primary">
                    <UserIcon size={12} />
                  </div>
                  <span>Created by: <span className="text-text-secondary">{task.userName || 'Anonymous'}</span></span>
                </div>
              </div>
              <div className="flex gap-2">
                {currentUser && task.userEmail === currentUser.email && (
                  <button 
                    className="p-2 rounded-xl bg-bg-secondary text-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-all active:scale-90" 
                    onClick={() => {
                      if (window.confirm("Are you sure you want to delete this task?")) {
                        // We need deleteTask prop in Detail too
                        onDelete();
                      }
                    }}
                    title="Delete Task"
                  >
                    <Trash2 size={24} />
                  </button>
                )}
                <button 
                  className="p-2 rounded-xl bg-bg-secondary text-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-all active:scale-90" 
                  onClick={onClose}
                  title="Close"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {task.detail && (
              <div className="bg-bg-secondary/30 border border-border-primary/50 rounded-2xl p-5 sm:p-6 fadeIn">
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-accent-primary/60 mb-3">
                  <FileText size={14} />
                  <span>Detail Description</span>
                </div>
                <p className="text-text-secondary text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
                  {task.detail}
                </p>
              </div>
            )}

            <button
              className={`flex items-center gap-3 p-5 rounded-2xl border transition-all duration-300 group ${
                isAssignment 
                ? "bg-accent-primary/10 border-accent-primary shadow-lg shadow-accent-primary/5" 
                : "bg-bg-secondary/50 border-border-primary hover:border-accent-primary/50"
              }`}
              onClick={handleToggleAssignment}
            >
              <div className={`p-2.5 rounded-xl transition-colors ${
                isAssignment ? "bg-accent-primary text-bg-primary" : "bg-bg-card text-text-muted group-hover:text-accent-primary"
              }`}>
                <BookOpen size={20} />
              </div>
              <div className="flex flex-col items-start">
                <span className={`text-sm font-bold ${isAssignment ? "text-white" : "text-text-secondary group-hover:text-text-primary"}`}>
                  {isAssignment ? "Collaborative Assignment Enabled" : "Enable Collaboration"}
                </span>
                <span className="text-[10px] text-text-muted">Allow others to post answers and solutions</span>
              </div>
            </button>

            {isAssignment && (
              <div className="mt-2 fadeIn">
                <Answer
                  answers={task.answers || []}
                  onAddAnswer={handleAddAnswer}
                  onDeleteAnswer={handleDeleteAnswer}
                  currentUser={currentUser}
                />
              </div>
            )}
          </div>
        </Motion.div>
      </div>
    </AnimatePresence>
  );
}

export default Detail;
