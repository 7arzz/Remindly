import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Calendar,
  User as UserIcon,
  FileText,
  Edit3,
  Trash2,
  MessageSquare,
  ExternalLink,
  Download,
  File,
  Image as ImageIcon,
} from "lucide-react";

const getFileType = (url) => {
  if (!url) return null;
  const ext = url.split("?")[0].split(".").pop().toLowerCase();
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext))
    return "image";
  if (["pdf"].includes(ext)) return "pdf";
  if (["doc", "docx"].includes(ext)) return "docx";
  if (["ppt", "pptx"].includes(ext)) return "pptx";
  if (["xls", "xlsx"].includes(ext)) return "xlsx";
  return "document";
};

export default function SummaryDetailModal({
  summary,
  isOpen,
  onClose,
  currentUser,
  onEdit,
  onDelete,
  onAskAI,
}) {
  if (!summary) return null;

  const isOwner = currentUser && summary.user_email === currentUser.email;
  const fileType = summary.image_url ? getFileType(summary.image_url) : null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[150] overflow-y-auto bg-black/60 backdrop-blur-sm custom-scrollbar"
          onClick={onClose}
        >
          <div className="flex min-h-full w-full justify-center items-start p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 24 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className="bg-bg-card border border-border-primary rounded-[32px] w-full max-w-2xl shadow-2xl relative overflow-hidden my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* ── Hero / Image Header ── */}
              <div className="relative h-52 sm:h-64 bg-bg-secondary overflow-hidden">
                {fileType === "image" ? (
                  <img
                    src={summary.image_url}
                    alt={summary.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-bg-secondary to-bg-card">
                    <FileText size={64} className="text-accent-primary/20" />
                  </div>
                )}

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/30" />

                {/* Close button */}
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-black/60 transition-all"
                >
                  <X size={18} />
                </button>

                {/* Owner / Edit / Delete actions */}
                {isOwner && (
                  <div className="absolute top-4 left-4 flex gap-2">
                    <button
                      onClick={() => { onClose(); onEdit(summary); }}
                      className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-black/60 transition-all"
                      title="Edit"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => { onDelete(summary); }}
                      className="w-10 h-10 rounded-full bg-rose-500/40 backdrop-blur-md border border-rose-400/20 flex items-center justify-center text-white hover:bg-rose-500/70 transition-all"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}

                {/* Title on hero */}
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight drop-shadow-md">
                    {summary.title}
                  </h2>
                </div>
              </div>

              {/* ── Content ── */}
              <div className="p-6 sm:p-8 flex flex-col gap-6">
                {/* Meta row */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-bg-secondary/50 rounded-2xl border border-border-primary/50">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                      Tanggal
                    </span>
                    <div className="flex items-center gap-2 text-sm font-bold text-text-primary">
                      <Calendar size={14} className="text-accent-primary" />
                      <span>
                        {new Date(summary.date).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-text-muted">
                      Dibuat oleh
                    </span>
                    <div className="flex items-center gap-2 text-sm font-bold text-accent-primary">
                      <UserIcon size={14} />
                      <span className="truncate">{summary.user_name}</span>
                    </div>
                  </div>
                </div>

                {/* Attachment — non-image document */}
                {summary.image_url && fileType !== "image" && (
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1">
                      Lampiran
                    </span>
                    <div className="flex items-center justify-between bg-bg-secondary/30 p-4 rounded-2xl border border-border-primary/30 hover:border-accent-primary/30 transition-all">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-accent-primary/10 text-accent-primary border border-accent-primary/20 flex items-center justify-center flex-shrink-0">
                          {fileType === "pdf" ? (
                            <span className="text-xs font-black">PDF</span>
                          ) : fileType === "pptx" ? (
                            <span className="text-xs font-black">PPT</span>
                          ) : fileType === "docx" ? (
                            <span className="text-xs font-black">DOC</span>
                          ) : (
                            <File size={18} />
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-text-primary truncate">
                            {summary.image_url.split("/").pop().split("?")[0]}
                          </span>
                          <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider">
                            {fileType} File
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <a
                          href={summary.image_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2.5 bg-accent-primary/10 text-accent-primary hover:bg-accent-primary hover:text-white rounded-xl transition-all"
                          title="Buka di browser"
                        >
                          <ExternalLink size={14} />
                        </a>
                        <a
                          href={summary.image_url}
                          download
                          className="p-2.5 bg-accent-primary/10 text-accent-primary hover:bg-accent-primary hover:text-white rounded-xl transition-all"
                          title="Unduh file"
                        >
                          <Download size={14} />
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {/* Attachment — image thumbnail (small) */}
                {summary.image_url && fileType === "image" && (
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-text-muted ml-1">
                      Lampiran Foto
                    </span>
                    <div className="flex items-center justify-between bg-bg-secondary/20 p-3 rounded-2xl border border-border-primary/20 hover:border-accent-primary/30 transition-all">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-xl overflow-hidden border border-border-primary/40 flex-shrink-0">
                          <img
                            src={summary.image_url}
                            alt="Thumbnail"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-text-primary">
                            Image Attachment
                          </span>
                          <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider">
                            JPEG / PNG / WebP
                          </span>
                        </div>
                      </div>
                      <a
                        href={summary.image_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 bg-accent-primary/10 text-accent-primary hover:bg-accent-primary hover:text-white rounded-xl transition-all"
                        title="Buka foto"
                      >
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  </div>
                )}

                {/* Full content */}
                <div className="flex flex-col gap-3">
                  <h3 className="text-xs font-black uppercase tracking-widest text-text-muted flex items-center gap-2">
                    <FileText size={14} />
                    Isi Catatan
                  </h3>
                  <div className="text-text-secondary leading-relaxed whitespace-pre-wrap bg-bg-secondary/30 p-5 rounded-2xl border border-border-primary/30 text-sm max-h-60 overflow-y-auto custom-scrollbar">
                    {summary.content}
                  </div>
                </div>

                {/* Ask AI button */}
                <button
                  onClick={() => {
                    onClose();
                    onAskAI(summary);
                  }}
                  className="w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 bg-accent-primary text-bg-primary hover:bg-accent-primary/90 transition-all shadow-lg shadow-accent-primary/20 active:scale-[0.98]"
                >
                  <MessageSquare size={20} />
                  Tanya AI tentang Catatan Ini
                </button>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
