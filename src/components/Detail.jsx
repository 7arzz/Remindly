import { motion as Motion, AnimatePresence } from "framer-motion";
import { X, BookOpen, Clock, AlertCircle, FileText, User as UserIcon } from "lucide-react";
import Answer from "./Answer";

function Detail({ task, onClose, updateTask, currentUser }) {
  if (!task) return null;

  const isAssignment = task.isAssignment || false;

  const handleToggleAssignment = () => {
    updateTask(task.id, { isAssignment: !isAssignment });
  };

  const handleAddAnswer = (text) => {
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
      <div className="modal-overlay" onClick={onClose}>
        <Motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="detail-modal"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="detail-header">
            <div>
              <h2 className="detail-title">{task.text}</h2>
              <div className="detail-meta">
                <div className="detail-meta-item">
                  <Clock size={16} />
                  {new Date(task.time).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
                <div className="detail-meta-item" style={{ textTransform: 'capitalize' }}>
                  <AlertCircle size={16} />
                  Priority: {task.priority}
                </div>
              </div>
              <div className="author-tag">
                <UserIcon size={12} />
                Created by: {task.userName || 'Anonymous'}
              </div>
            </div>
            <button className="icon-btn" onClick={onClose} style={{ alignSelf: 'flex-start' }}>
              <X size={24} />
            </button>
          </div>

          {task.detail && (
            <div className="detail-description-card">
              <div className="detail-card-label">
                <FileText size={14} />
                Detail
              </div>
              <p className="detail-description-text">
                {task.detail}
              </p>
            </div>
          )}

          <div
            className="assignment-toggle"
            onClick={handleToggleAssignment}
            style={{
              borderColor: isAssignment ? "var(--accent-primary)" : "var(--border-primary)",
              background: isAssignment ? "var(--bg-primary)" : "var(--bg-secondary)"
            }}
          >
            <BookOpen size={20} color={isAssignment ? "var(--accent-primary)" : "var(--text-muted)"} />
            <span style={{ color: isAssignment ? "white" : "var(--text-secondary)", fontWeight: 500 }}>
              {isAssignment ? "Collaborative Assignment" : "Mark as Collaborative Assignment"}
            </span>
          </div>

          {isAssignment && (
            <Answer
              answers={task.answers || []}
              onAddAnswer={handleAddAnswer}
              onDeleteAnswer={handleDeleteAnswer}
              currentUser={currentUser}
            />
          )}
        </Motion.div>
      </div>
    </AnimatePresence>
  );
}

export default Detail;
