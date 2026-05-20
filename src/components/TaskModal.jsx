import { createPortal } from "react-dom";
import { useState, useEffect } from "react";
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
  Pencil,
  Save,
  Send,
  Loader2,
  File,
  Download,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { formatForDateTimeLocal } from "../utils/helpers";
import { supabase } from "../supabase";

const getFileType = (url) => {
  if (!url) return null;
  const ext = url.split("?")[0].split(".").pop().toLowerCase();
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) {
    return "image";
  }
  if (["pdf"].includes(ext)) return "pdf";
  if (["doc", "docx"].includes(ext)) return "docx";
  if (["ppt", "pptx"].includes(ext)) return "pptx";
  if (["xls", "xlsx"].includes(ext)) return "xlsx";
  return "document";
};

const TaskModal = ({
  task,
  onClose,
  onDelete,
  toggleDone,
  onUpdate,
  currentUser,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [editDetail, setEditDetail] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editPriority, setEditPriority] = useState("");

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);

  useEffect(() => {
    if (!task) return;

    setIsCommentsLoading(true);
    const fetchComments = async () => {
      const { data, error } = await supabase
        .from("task_comments")
        .select("*")
        .eq("task_id", task.id)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching comments:", error);
      } else {
        setComments(data || []);
      }
      setIsCommentsLoading(false);
    };

    fetchComments();

    const channel = supabase
      .channel(`task_comments_${task.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "task_comments",
          filter: `task_id=eq.${task.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setComments((prev) => {
              if (prev.some((c) => c.id === payload.new.id)) return prev;
              return [...prev, payload.new];
            });
          } else if (payload.eventType === "DELETE") {
            setComments((prev) => prev.filter((c) => c.id !== payload.old.id));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [task]);

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || isPosting) return;

    setIsPosting(true);
    try {
      const commentData = {
        task_id: task.id,
        user_id: currentUser.id,
        user_name:
          currentUser.user_metadata?.full_name ||
          currentUser.email.split("@")[0],
        user_email: currentUser.email,
        content: newComment.trim(),
      };

      const { error } = await supabase
        .from("task_comments")
        .insert([commentData]);

      if (error) throw error;
      setNewComment("");
    } catch (error) {
      console.error("Error posting comment:", error);
      toast.error("Failed to post comment");
    } finally {
      setIsPosting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      const { error } = await supabase
        .from("task_comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;
      toast.success("Comment deleted");
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast.error("Failed to delete comment");
    }
  };

  useEffect(() => {
    if (!task) return;

    // Avoid cascading renders flagged by eslint by batching into a single microtask.
    Promise.resolve().then(() => {
      setEditText(task.text);
      setEditDetail(task.detail || "");
      // Never bind raw timestamptz/UTC value directly into date/time inputs.
      // Convert to local datetime-local format first.
      setEditTime(formatForDateTimeLocal(task.time));
      setEditPriority(task.priority);
    });
  }, [task]);

  if (!task) return null;

  const isOwner = !!currentUser;

  const handleSave = async () => {
    if (!editText.trim()) {
      toast.error("Task title cannot be empty");
      return;
    }

    try {
      await onUpdate(task.id, {
        text: editText,
        detail: editDetail,
        // editTime is datetime-local local format (YYYY-MM-DDTHH:mm)
        // Convert to ISO UTC on SAVE.
        time: new Date(editTime).toISOString(),
        priority: editPriority,
      });

      setIsEditing(false);
      toast.success("Task updated successfully!");
    } catch {
      toast.error("Failed to update task");
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] overflow-y-auto bg-black/60 backdrop-blur-sm custom-scrollbar"
      onClick={onClose}
    >
      <div className="flex min-h-full w-full justify-center items-start p-4 sm:p-6">
        <div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.2 }}
          className="bg-bg-card border border-border-primary rounded-[32px] w-full max-w-2xl shadow-2xl relative z-[1001] overflow-hidden my-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative h-48 sm:h-64 bg-bg-secondary overflow-hidden">
            {task.image_url && getFileType(task.image_url) === "image" ? (
              <img
                src={task.image_url}
                alt={task.text}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-bg-secondary to-bg-card">
                <CheckCircle size={64} className="text-accent-primary/20" />
              </div>
            )}

            {/* Overlay */}
            <div className="absolute inset-0 bg-black/40" />

            {/* Top Actions */}
            <div className="absolute top-4 left-4 right-4 flex items-start justify-between">
              <div className="flex gap-2">
                {task.done ? (
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-accent-primary/20 text-accent-primary border border-accent-primary/30 backdrop-blur-md">
                    Completed
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-500/20 text-amber-300 border border-amber-400/30 backdrop-blur-md">
                    Pending
                  </span>
                )}

                {isEditing && (
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value)}
                    className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-bg-card/40 text-white border border-white/20 backdrop-blur-md focus:outline-none"
                  >
                    <option value="low" className="bg-bg-card">
                      Low
                    </option>
                    <option value="medium" className="bg-bg-card">
                      Medium
                    </option>
                    <option value="high" className="bg-bg-card">
                      High
                    </option>
                  </select>
                )}
              </div>

              <div className="flex gap-2">
                {isOwner && !isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-black/60 transition-all"
                  >
                    <Pencil size={18} />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-black/60 transition-all"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Title */}
            <div className="absolute bottom-0 left-0 right-0 p-6">
              {isEditing ? (
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full bg-black/20 backdrop-blur-md border border-white/20 rounded-xl px-4 py-2 text-2xl sm:text-3xl font-black text-white focus:outline-none focus:border-white/40"
                  placeholder="Task Title"
                />
              ) : (
                <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                  {task.text}
                </h2>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 sm:p-8 flex flex-col gap-8">
            {/* Meta Info */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 bg-bg-secondary border border-border-primary/50 rounded-2xl">
              {/* Deadline */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                  Deadline
                </span>

                <div className="flex items-center gap-2 text-sm font-bold text-text-primary">
                  <Calendar size={14} className="text-accent-primary" />
                  {isEditing ? (
                    <input
                      type="date"
                      value={editTime.split("T")[0]}
                      onChange={(e) => {
                        const newDate = e.target.value;
                        const currentTime = editTime.split("T")[1];
                        setEditTime(`${newDate}T${currentTime}`);
                      }}
                      className="bg-transparent border-none focus:outline-none text-accent-primary color-scheme-dark"
                    />
                  ) : (
                    <span>{new Date(task.time).toLocaleDateString()}</span>
                  )}
                </div>
              </div>

              {/* Time */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                  Time
                </span>

                <div className="flex items-center gap-2 text-sm font-bold text-text-primary">
                  <Clock size={14} className="text-accent-primary" />
                  {isEditing ? (
                    <input
                      type="time"
                      value={editTime.split("T")[1]?.substring(0, 5)}
                      onChange={(e) => {
                        const newTime = e.target.value;
                        const currentDate = editTime.split("T")[0];
                        setEditTime(`${currentDate}T${newTime}`);
                      }}
                      className="bg-transparent border-none focus:outline-none text-accent-primary color-scheme-dark"
                    />
                  ) : (
                    <span>
                      {new Date(task.time).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
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

            {/* Attachment / Document */}
            {task.image_url && (
              <div className="flex flex-col gap-2.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1">
                  Attachment File
                </span>
                {getFileType(task.image_url) === "image" ? (
                  <div className="flex items-center justify-between bg-bg-secondary/20 p-4 rounded-2xl border border-border-primary/20 hover:border-accent-primary/30 transition-all">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl overflow-hidden border border-border-primary/40 flex-shrink-0">
                        <img
                          src={task.image_url}
                          alt="Attachment"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-text-primary truncate">
                          Image Attachment
                        </span>
                        <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider">
                          JPEG/PNG/WebP
                        </span>
                      </div>
                    </div>
                    <a
                      href={task.image_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 bg-accent-primary/10 text-accent-primary hover:bg-accent-primary hover:text-white rounded-xl transition-all"
                      title="Open Image"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-bg-secondary/20 p-4 rounded-2xl border border-border-primary/20 hover:border-accent-primary/30 transition-all">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-accent-primary/10 text-accent-primary border border-accent-primary/20 flex items-center justify-center flex-shrink-0">
                        {getFileType(task.image_url) === "pdf" ? (
                          <span className="text-xs font-black">PDF</span>
                        ) : getFileType(task.image_url) === "pptx" ? (
                          <span className="text-xs font-black">PPT</span>
                        ) : getFileType(task.image_url) === "docx" ? (
                          <span className="text-xs font-black">DOC</span>
                        ) : (
                          <File size={18} />
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-text-primary truncate">
                          {task.image_url.split("/").pop().split("?")[0]}
                        </span>
                        <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider">
                          {getFileType(task.image_url)} File
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={task.image_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 bg-accent-primary/10 text-accent-primary hover:bg-accent-primary hover:text-white rounded-xl transition-all"
                        title="Open in Browser"
                      >
                        <ExternalLink size={14} />
                      </a>
                      <a
                        href={task.image_url}
                        download
                        className="p-2.5 bg-accent-primary/10 text-accent-primary hover:bg-accent-primary hover:text-white rounded-xl transition-all"
                        title="Download File"
                      >
                        <Download size={14} />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-text-muted flex items-center gap-2">
                <MessageCircle size={14} />
                Description
              </h3>

              {isEditing ? (
                <textarea
                  value={editDetail}
                  onChange={(e) => setEditDetail(e.target.value)}
                  rows={4}
                  className="w-full bg-bg-secondary p-5 rounded-2xl border border-border-primary/30 text-text-secondary focus:outline-none focus:border-accent-primary transition-all resize-none"
                  placeholder="Task description..."
                />
              ) : (
                <div className="text-text-secondary leading-relaxed whitespace-pre-wrap bg-bg-secondary p-5 rounded-2xl border border-border-primary/30">
                  {task.detail ||
                    "No additional details provided for this task."}
                </div>
              )}
            </div>

            {/* Comments Section */}
            {!isEditing && (
              <div className="flex flex-col gap-4 border-t border-border-primary/30 pt-6">
                <h3 className="text-xs font-black uppercase tracking-widest text-text-muted flex items-center gap-2">
                  <MessageCircle size={14} />
                  Comments ({comments.length})
                </h3>

                {/* Comment list */}
                <div className="flex flex-col gap-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                  {isCommentsLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2
                        size={20}
                        className="animate-spin text-accent-primary"
                      />
                    </div>
                  ) : comments.length === 0 ? (
                    <p className="text-xs text-text-muted font-bold tracking-tight italic py-2 pl-1">
                      No comments yet. Be the first to say something!
                    </p>
                  ) : (
                    comments.map((comment) => (
                      <div
                        key={comment.id}
                        className="flex gap-3 bg-bg-secondary p-3.5 rounded-2xl border border-border-primary/20 relative group hover:border-border-primary/45 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full bg-accent-primary/10 text-accent-primary border border-accent-primary/20 flex items-center justify-center font-black text-xs flex-shrink-0">
                          {comment.user_name
                            ? comment.user_name[0].toUpperCase()
                            : "?"}
                        </div>
                        <div className="flex flex-col flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2 mb-1">
                            <span className="text-xs font-black text-text-primary truncate">
                              {comment.user_name}
                            </span>
                            <span className="text-[9px] text-text-muted font-bold tracking-tight">
                              {new Date(comment.created_at).toLocaleDateString(
                                [],
                                {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </span>
                          </div>
                          <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap">
                            {comment.content}
                          </p>
                        </div>

                        {currentUser && comment.user_id === currentUser.id && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="absolute right-3.5 top-3.5 text-text-muted hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-all active:scale-95"
                            title="Delete Comment"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Post a new comment */}
                {currentUser && (
                  <form
                    onSubmit={handlePostComment}
                    className="flex gap-2.5 mt-2"
                  >
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      className="flex-1 bg-bg-secondary border border-border-primary/40 rounded-xl px-4 py-3 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary focus:bg-bg-primary transition-all"
                      disabled={isPosting}
                      required
                    />
                    <button
                      type="submit"
                      disabled={!newComment.trim() || isPosting}
                      className="p-3 bg-accent-primary text-bg-primary rounded-xl hover:bg-accent-primary/95 transition-all disabled:opacity-50 flex items-center justify-center flex-shrink-0 active:scale-95"
                    >
                      {isPosting ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Send size={14} />
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4 pt-4 border-t border-border-primary/30">
              {isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex-1 py-4 rounded-2xl font-bold bg-bg-secondary text-text-primary hover:bg-bg-secondary/80 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold bg-accent-primary text-bg-primary hover:bg-accent-primary/90 transition-all shadow-lg shadow-accent-primary/20"
                  >
                    <Save size={20} />
                    Save Changes
                  </button>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,

    document.body,
  );
};

export default TaskModal;
