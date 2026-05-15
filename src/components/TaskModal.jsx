import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import {
  X,
  Calendar,
  Clock,
  User,
  MessageCircle,
  CheckCircle,
  Circle,
  Trash2,
  Bell,
} from "lucide-react";

const TaskModal = ({
  task,
  isOpen,
  onClose,
  onDelete,
  toggleDone,
  currentUser,
}) => {
  if (!task) return null;

  const isOwner = currentUser && task.user_email === currentUser.email;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] overflow-y-auto bg-black/60 backdrop-blur-sm custom-scrollbar"
      onClick={onClose}
    >
      <div className="flex min-h-full w-full justify-center items-start p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.2 }}
          className="bg-bg-card border border-border-primary rounded-[32px] w-full max-w-2xl shadow-2xl relative z-[1001] overflow-hidden my-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative h-48 sm:h-64 bg-bg-secondary overflow-hidden">
            {task.image_url ? (
              <img
                src={task.image_url}
                alt={task.text}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-bg-secondary to-bg-card">
                <CheckCircle
                  size={64}
                  className="text-accent-primary/20"
                />
              </div>
            )}

            {/* Overlay */}
            <div className="absolute inset-0 bg-black/40" />

            {/* Top Actions */}
            <div className="absolute top-4 left-4 right-4 flex items-start justify-between">
              {task.done ? (
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-accent-primary/20 text-accent-primary border border-accent-primary/30 backdrop-blur-md">
                  Completed
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-500/20 text-amber-300 border border-amber-400/30 backdrop-blur-md">
                  Pending
                </span>
              )}

              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-black/60 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Title */}
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                {task.text}
              </h2>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 sm:p-8 flex flex-col gap-8">
            {/* Meta Info */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 bg-bg-secondary/50 rounded-2xl border border-border-primary/50">
              {/* Deadline */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                  Deadline
                </span>

                <div className="flex items-center gap-2 text-sm font-bold text-text-primary">
                  <Calendar size={14} className="text-accent-primary" />

                  <span>{new Date(task.time).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Time */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                  Time
                </span>

                <div className="flex items-center gap-2 text-sm font-bold text-text-primary">
                  <Clock size={14} className="text-accent-primary" />

                  <span>
                    {new Date(task.time).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>

              {/* Owner */}
              <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                  Owner
                </span>

                <div className="flex items-center gap-2 text-sm font-bold text-accent-primary">
                  <User size={14} />
                  <span>{task.user_name}</span>
                </div>
              </div>

              {/* Reminder */}
              {task.reminder_offset > 0 && (
                <div className="flex flex-col gap-1 col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                    Reminder
                  </span>

                  <div className="flex items-center gap-2 text-sm font-bold text-amber-400">
                    <Bell size={14} />

                    <span>
                      {task.reminder_offset >= 1440
                        ? "1 Day"
                        : task.reminder_offset >= 60
                          ? `${task.reminder_offset / 60} Hour${
                              task.reminder_offset / 60 > 1 ? "s" : ""
                            }`
                          : `${task.reminder_offset} Mins`}{" "}
                      before
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-text-muted flex items-center gap-2">
                <MessageCircle size={14} />
                Description
              </h3>

              <div className="text-text-secondary leading-relaxed whitespace-pre-wrap bg-bg-secondary/30 p-5 rounded-2xl border border-border-primary/30">
                {task.detail ||
                  "No additional details provided for this task."}
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
                {task.done ? (
                  <CheckCircle size={20} />
                ) : (
                  <Circle size={20} />
                )}

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
    </div>,
    document.body,
  );
};

export default TaskModal;
