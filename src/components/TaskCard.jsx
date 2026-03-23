import { motion as Motion } from "framer-motion";

import {
  Clock,
  CheckCircle,
  Circle,
  Edit3,
  Check,
  Bell,
  Trash2,
  X,
} from "lucide-react";

import { useState } from "react";

function TaskCard({ task, deleteTask, toggleDone, updateTask }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(task.text);
  const [editTime, setEditTime] = useState(task.time);
  const [editPriority, setEditPriority] = useState(task.priority);
  const [editReminderMinutes, setEditReminderMinutes] = useState(
    task.reminderMinutes || 0,
  );

  const isExpired =
    !task.done && new Date(task.time).getTime() <= new Date().getTime();

  const handleSave = () => {
    updateTask(task.id, {
      text: editText,
      time: editTime,
      priority: editPriority,
      reminderMinutes: editReminderMinutes,
      reminderSent: false, // Reset reminder status on edit
    });
    setIsEditing(false);
  };

  return (
    <Motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, x: -20 }}
      whileHover={{ y: isEditing ? 0 : -2 }}
      className={`task-item ${task.done ? "task-done" : ""}`}
      style={{ flexDirection: "column", alignItems: "stretch" }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <button
          className="icon-btn"
          onClick={() => toggleDone(task.id)}
          style={{
            color: task.done ? "var(--accent-primary)" : "var(--text-muted)",
          }}
          disabled={isEditing}
        >
          {task.done ? <CheckCircle size={22} /> : <Circle size={22} />}
        </button>

        {isEditing ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <input
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              autoFocus
              className="edit-input"
            />
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="datetime-local"
                value={editTime}
                onChange={(e) => setEditTime(e.target.value)}
                className="edit-input mini"
              />
              <select
                value={editPriority}
                onChange={(e) => setEditPriority(e.target.value)}
                className="edit-input mini"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Bell size={14} style={{ color: "var(--text-muted)" }} />
              <select
                value={editReminderMinutes}
                onChange={(e) =>
                  setEditReminderMinutes(parseInt(e.target.value))
                }
                className="edit-input mini"
                style={{ flex: 1 }}
              >
                <option value={0}>No early reminder</option>
                <option value={5}>5 mins before</option>
                <option value={15}>15 mins before</option>
                <option value={30}>30 mins before</option>
                <option value={60}>1 hour before</option>
                <option value={1440}>1 day before</option>
              </select>
            </div>
          </div>
        ) : (
          <div className="task-info" style={{ flex: 1 }}>
            <span className="task-text">{task.text}</span>
            <div className="task-time">
              <Clock size={12} />
              {new Date(task.time).toLocaleString([], {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
              <span className={`priority-badge priority-${task.priority}`}>
                {task.priority}
              </span>
              {task.reminderMinutes > 0 && (
                <span
                  className="priority-badge"
                  style={{
                    background: "rgba(168, 85, 247, 0.1)",
                    color: "#a855f7",
                    border: "1px solid rgba(168, 85, 247, 0.2)",
                  }}
                >
                  <Bell size={10} style={{ marginRight: "4px" }} />
                  {task.reminderMinutes === 1440
                    ? "1d"
                    : `${task.reminderMinutes}m`}{" "}
                  earlier
                </span>
              )}
              {isExpired && !task.done && (
                <span
                  style={{
                    color: "#ef4444",
                    fontSize: "0.7rem",
                    fontWeight: "bold",
                  }}
                >
                  • EXPIRED
                </span>
              )}
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: "4px" }}>
          {isEditing ? (
            <>
              <button
                className="icon-btn"
                onClick={handleSave}
                style={{ color: "#10b981" }}
              >
                <Check size={18} />
              </button>
              <button
                className="icon-btn"
                onClick={() => setIsEditing(false)}
                style={{ color: "#ef4444" }}
              >
                <X size={18} />
              </button>
            </>
          ) : (
            <>
              <button className="icon-btn" onClick={() => setIsEditing(true)}>
                <Edit3 size={18} />
              </button>
              <button
                className="icon-btn delete"
                onClick={() => deleteTask(task.id)}
              >
                <Trash2 size={18} />
              </button>
            </>
          )}
        </div>
      </div>
    </Motion.div>
  );
}

export default TaskCard;
