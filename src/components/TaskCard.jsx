import { motion as Motion } from "framer-motion";

import {
  Clock,
  CheckCircle,
  Circle,
  Edit3,
  Check,
  Trash2,
  X,
} from "lucide-react";

import { useState } from "react";

function TaskCard({ task, deleteTask, toggleDone, updateTask, currentUser, onClick }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(task.text);
  const [editTime, setEditTime] = useState(task.time);
  const [editPriority, setEditPriority] = useState(task.priority);
  const [editDetail, setEditDetail] = useState(task.detail || "");

  const isOwner = currentUser && task.userEmail === currentUser.email;

  const isExpired =
    !task.done && new Date(task.time).getTime() <= new Date().getTime();

  const handleSave = () => {
    updateTask(task.id, {
      text: editText,
      time: editTime,
      priority: editPriority,
      detail: editDetail,
    });
    setIsEditing(false);
  };

  return (
    <Motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: isEditing ? 0 : -3 }}
      className={`relative group p-5 rounded-2xl border transition-all duration-300 ${
        task.done 
        ? "bg-bg-card/30 border-border-primary/30 opacity-60 grayscale-[0.2]" 
        : "bg-bg-card/80 border-border-primary/60 hover:border-accent-primary/50 shadow-lg shadow-black/20"
      }`}
    >
      <div className="flex items-start gap-4">
        <button
          className={`shrink-0 mt-1 transition-all duration-300 transform active:scale-90 ${
            task.done ? "text-accent-primary" : "text-text-muted hover:text-accent-primary/80"
          }`}
          onClick={() => toggleDone(task.id)}
          disabled={isEditing}
        >
          {task.done ? <CheckCircle size={24} strokeWidth={2.5} /> : <Circle size={24} strokeWidth={2} />}
        </button>

        {isEditing ? (
          <div className="flex-1 flex flex-col gap-3 fadeIn">
            <input
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              autoFocus
              className="w-full bg-bg-primary/50 border border-accent-primary/30 rounded-xl px-4 py-2 text-text-primary focus:outline-none focus:border-accent-primary transition-all shadow-inner"
            />
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="datetime-local"
                value={editTime}
                onChange={(e) => setEditTime(e.target.value)}
                className="flex-1 bg-bg-primary/50 border border-accent-primary/20 rounded-lg px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent-primary transition-all"
              />
              <select
                value={editPriority}
                onChange={(e) => setEditPriority(e.target.value)}
                className="sm:w-32 bg-bg-primary/50 border border-accent-primary/20 rounded-lg px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent-primary transition-all"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <textarea
              value={editDetail}
              onChange={(e) => setEditDetail(e.target.value)}
              placeholder="Add details (optional)..."
              className="w-full bg-bg-primary/50 border border-accent-primary/20 rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent-primary transition-all min-h-[60px] resize-none"
            />
          </div>
        ) : (
          <div 
            className="flex-1 min-w-0 cursor-pointer group/content" 
            onClick={onClick}
          >
            <h3 className={`text-base sm:text-lg font-bold leading-tight mb-2 transition-all ${
              task.done ? "line-through text-text-muted" : "text-text-primary group-hover/content:text-accent-primary"
            }`}>
              {task.text}
            </h3>
            
            <div className="flex flex-wrap items-center gap-3 mt-auto">
              <div className="flex items-center gap-1.5 text-text-muted text-[10px] sm:text-xs font-medium">
                <Clock size={12} className="text-accent-primary/40" />
                <span>
                  {new Date(task.time).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              
              <div className="flex gap-2">
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${
                  task.priority === 'high' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                  task.priority === 'medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}>
                  {task.priority}
                </span>
                
                {task.isAssignment && (
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                    Assignment
                  </span>
                )}
              </div>

              {isExpired && !task.done && (
                <span className="flex items-center gap-1 text-[10px] font-black text-rose-500 animate-pulse">
                  <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
                  EXPIRED
                </span>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-1 shrink-0">
          {isEditing ? (
            <>
              <button
                className="p-2 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                onClick={handleSave}
              >
                <Check size={18} />
              </button>
              <button
                className="p-2 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors"
                onClick={() => setIsEditing(false)}
              >
                <X size={18} />
              </button>
            </>
          ) : (
            isOwner && (
              <>
                <button 
                  className="p-2 rounded-lg text-text-muted hover:text-accent-primary hover:bg-accent-primary/10 transition-all sm:opacity-0 group-hover:opacity-100"
                  onClick={() => setIsEditing(true)}
                  title="Edit Task"
                >
                  <Edit3 size={18} />
                </button>
                <button
                  className="p-2 rounded-lg text-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-all sm:opacity-0 group-hover:opacity-100"
                  onClick={() => deleteTask(task.id)}
                  title="Delete Task"
                >
                  <Trash2 size={18} />
                </button>
              </>
            )
          )}
        </div>
      </div>
    </Motion.div>
  );
}

export default TaskCard;
