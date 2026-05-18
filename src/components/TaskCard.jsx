import { motion as Motion } from "framer-motion";
import { Trash2, CheckCircle, Circle, Clock, MessageSquare, Pencil } from "lucide-react";
import { toast } from "sonner";

function TaskCard({ task, deleteTask, toggleDone, currentUser, onClick, onEditClick }) {
  const isOwner = currentUser && task.user_email === currentUser.email;
  const isExpired = !task.done && new Date(task.time).getTime() <= new Date().getTime();

  return (
    <Motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      whileHover={{ y: -5 }}
      className={`glass-card flex flex-col p-5 group cursor-pointer relative overflow-hidden ${task.done ? 'opacity-60' : ''}`}
      onClick={onClick}
    >
      {/* Priority Indicator Line */}
      <div className={`absolute top-0 left-0 w-1.5 h-full ${
        task.priority === 'high' ? 'bg-rose-500' :
        task.priority === 'medium' ? 'bg-amber-500' :
        'bg-emerald-500'
      }`} />

      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full animate-pulse ${
            task.priority === 'high' ? 'bg-rose-500' :
            task.priority === 'medium' ? 'bg-amber-500' :
            'bg-emerald-500'
          }`} />
          <span className={`text-[10px] font-black uppercase tracking-widest ${
            task.priority === 'high' ? 'priority-tag-high' :
            task.priority === 'medium' ? 'priority-tag-medium' :
            'priority-tag-low'
          }`}>
            {task.priority}
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleDone(task.id);
          }}
          className={`p-1 rounded-lg transition-all ${
            task.done 
              ? "text-accent-primary bg-accent-primary/10" 
              : "text-text-muted hover:text-accent-primary hover:bg-accent-primary/10"
          }`}
        >
          {task.done ? <CheckCircle size={18} /> : <Circle size={18} />}
        </button>
      </div>

      <h3 className={`text-lg font-bold leading-tight mb-3 transition-all ${task.done ? 'text-text-muted line-through' : 'text-text-primary group-hover:text-accent-primary'}`}>
        {task.text}
      </h3>

      {task.detail && (
        <div className="flex items-center gap-1.5 text-text-muted text-xs mb-4">
          <MessageSquare size={12} />
          <span className="truncate">{task.detail}</span>
        </div>
      )}

      <div className="mt-auto pt-4 border-t border-border-primary/30 flex justify-between items-center">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-text-muted">
          <Clock size={12} className={isExpired && !task.done ? "text-rose-500" : "text-accent-primary/40"} />
          <span className={isExpired && !task.done ? "text-rose-400" : ""}>
            {new Date(task.time).toLocaleDateString([], { month: 'short', day: 'numeric' })}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          {isOwner && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEditClick(); // Trigger edit modal
                }}
                className="p-1.5 rounded-lg text-text-muted hover:text-accent-primary hover:bg-accent-primary/10 transition-all opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                title="Edit Task"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toast("Delete Task?", {
                    description: "Are you sure you want to delete this task?",
                    action: {
                      label: "Delete",
                      onClick: () => deleteTask(task.id)
                    },
                    cancel: { label: "Cancel" }
                  });
                }}
                className="p-1.5 rounded-lg text-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-all opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                title="Delete Task"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      {isExpired && !task.done && (
        <div className="absolute top-2 right-2 rotate-12">
          <span className="px-2 py-0.5 bg-rose-500 text-white text-[8px] font-black tracking-tighter rounded border border-white/20 shadow-lg">
            OVERDUE
          </span>
        </div>
      )}
    </Motion.div>
  );
}

export default TaskCard;
