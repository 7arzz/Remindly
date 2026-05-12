import { motion as Motion } from "framer-motion";
import { Trash2, CheckCircle, Circle, Clock } from "lucide-react";
import envelopeImg from "../assets/envelope.png";

function TaskCard({ task, deleteTask, toggleDone, currentUser, onClick }) {
  const isOwner = currentUser && task.userEmail === currentUser.email;
  const isExpired = !task.done && new Date(task.time).getTime() <= new Date().getTime();

  return (
    <Motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      whileHover={{ y: -5, scale: 1.02 }}
      className="relative group cursor-pointer"
      onClick={onClick}
    >
      <div className="relative aspect-[3/2] w-full overflow-hidden rounded-2xl bg-bg-card/20 backdrop-blur-sm border border-border-primary/50 group-hover:border-accent-primary/50 transition-all duration-300 shadow-xl">
        {/* Envelope Image Background */}
        <img 
          src={envelopeImg} 
          alt="Task Envelope" 
          className={`w-full h-full object-contain p-4 transition-all duration-500 ${task.done ? 'opacity-40 grayscale' : 'opacity-90 group-hover:opacity-100 group-hover:scale-110'}`}
        />

        {/* Task Overlay Info */}
        <div className="absolute inset-0 flex flex-col justify-end p-4 bg-gradient-to-t from-bg-primary/90 via-bg-primary/40 to-transparent">
          <h3 className={`text-sm font-bold truncate mb-1 transition-all ${task.done ? 'text-text-muted line-through' : 'text-text-primary group-hover:text-accent-primary'}`}>
            {task.text}
          </h3>
          
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 text-[10px] text-text-secondary">
              <Clock size={10} className="text-accent-primary/60" />
              <span>{new Date(task.time).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
            </div>
            
            <div className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${
              task.priority === 'high' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
              task.priority === 'medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
              'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            }`}>
              {task.priority}
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div className="absolute top-3 left-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleDone(task.id);
            }}
            className={`p-1.5 rounded-full backdrop-blur-md border transition-all ${
              task.done 
                ? "bg-accent-primary/20 border-accent-primary/50 text-accent-primary" 
                : "bg-black/20 border-white/10 text-white/40 hover:text-white"
            }`}
          >
            {task.done ? <CheckCircle size={14} /> : <Circle size={14} />}
          </button>
        </div>

        {/* Delete Button (Owner Only) */}
        {isOwner && (
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteTask(task.id);
              }}
              className="p-1.5 rounded-full bg-rose-500/20 border border-rose-500/50 text-rose-400 hover:bg-rose-500 hover:text-white transition-all"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}

        {isExpired && !task.done && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-15deg] pointer-events-none">
            <span className="px-3 py-1 bg-rose-600 text-white text-[10px] font-black tracking-tighter rounded-sm shadow-lg border-2 border-white/20">
              EXPIRED
            </span>
          </div>
        )}
      </div>
    </Motion.div>
  );
}

export default TaskCard;
