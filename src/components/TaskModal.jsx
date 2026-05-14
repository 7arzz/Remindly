import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, Clock, User, MessageCircle, CheckCircle, Circle, Trash2, Bell } from "lucide-react";

const TaskModal = ({ task, isOpen, onClose, onDelete, toggleDone, currentUser }) => {
  if (!task) return null;

  const isOwner = currentUser && task.user_email === currentUser.email;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-bg-card border border-border-primary rounded-[32px] w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl relative z-[1001]"
          >
            {/* Header with Background/Image */}
            <div className="relative h-48 sm:h-64 bg-bg-secondary overflow-hidden">
              {task.image_url ? (
                <img src={task.image_url} alt={task.text} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-bg-secondary to-bg-card">
                  <span className="text-accent-primary/20 font-black text-6xl uppercase tracking-tighter opacity-10">{task.text}</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-bg-card via-transparent to-transparent" />
              
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-xl bg-black/20 backdrop-blur-md text-white hover:bg-rose-500 transition-all"
              >
                <X size={20} />
              </button>

              <div className="absolute bottom-6 left-6 right-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                    task.priority === 'high' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' :
                    task.priority === 'medium' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                    'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  }`}>
                    {task.priority} Priority
                  </span>
                  {task.done && (
                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-accent-primary/20 text-accent-primary border border-accent-primary/30">
                      Completed
                    </span>
                  )}
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                  {task.text}
                </h2>
              </div>
            </div>

            <div className="p-6 sm:p-8 flex flex-col gap-8">
              {/* Meta Info */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 bg-bg-secondary/50 rounded-2xl border border-border-primary/50">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Deadline</span>
                  <div className="flex items-center gap-2 text-sm font-bold text-text-primary">
                    <Calendar size={14} className="text-accent-primary" />
                    <span>{new Date(task.time).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Time</span>
                  <div className="flex items-center gap-2 text-sm font-bold text-text-primary">
                    <Clock size={14} className="text-accent-primary" />
                    <span>{new Date(task.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Owner</span>
                  <div className="flex items-center gap-2 text-sm font-bold text-accent-primary">
                    <User size={14} />
                    <span>{task.user_name}</span>
                  </div>
                </div>
                {task.reminder_offset > 0 && (
                  <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">Reminder</span>
                    <div className="flex items-center gap-2 text-sm font-bold text-amber-400">
                      <Bell size={14} />
                      <span>
                        {task.reminder_offset >= 1440 
                          ? '1 Day' 
                          : task.reminder_offset >= 60 
                            ? `${task.reminder_offset / 60} Hour${task.reminder_offset / 60 > 1 ? 's' : ''}` 
                            : `${task.reminder_offset} Mins`
                        } before
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Detail / Description */}
              <div className="flex flex-col gap-3">
                <h3 className="text-xs font-black uppercase tracking-widest text-text-muted flex items-center gap-2">
                  <MessageCircle size={14} />
                  Description
                </h3>
                <div className="text-text-secondary leading-relaxed whitespace-pre-wrap bg-bg-secondary/30 p-5 rounded-2xl border border-border-primary/30">
                  {task.detail || "No additional details provided for this task."}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4 pt-4 border-t border-border-primary/30">
                <button
                  onClick={() => {
                    toggleDone(task.id);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold transition-all ${
                    task.done 
                    ? "bg-accent-primary/10 text-accent-primary border border-accent-primary/20" 
                    : "bg-accent-primary text-bg-primary hover:bg-accent-primary/90"
                  }`}
                >
                  {task.done ? <CheckCircle size={20} /> : <Circle size={20} />}
                  {task.done ? "Mark as Pending" : "Mark as Completed"}
                </button>
                
                {isOwner && (
                  <button
                    onClick={() => {
                      onDelete(task.id);
                      onClose();
                    }}
                    className="p-4 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all"
                    title="Delete Task"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default TaskModal;
