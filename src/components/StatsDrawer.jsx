import { motion as Motion, AnimatePresence } from "framer-motion";

import { X, BarChart3, History, CheckCircle, Clock } from "lucide-react";

function StatsDrawer({ isOpen, onClose, tasks, history }) {
  const completedToday = tasks.filter((t) => t.done).length;
  const totalTasks = tasks.length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <Motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="modal-overlay"
          />
          <Motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="stats-drawer glass-card"
          >
            <div className="drawer-header">
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <BarChart3 size={20} className="accent-text" />
                <h3 style={{ margin: 0 }}>Statistics & History</h3>
              </div>
              <button className="icon-btn" onClick={onClose}>
                <X size={20} />
              </button>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-label">Total Reminders</span>
                <span className="stat-value">{totalTasks}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Completed Today</span>
                <span className="stat-value">{completedToday}</span>
              </div>
            </div>

            <div className="history-section">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "12px",
                }}
              >
                <History size={16} color="var(--text-muted)" />
                <h4
                  style={{
                    margin: 0,
                    fontSize: "0.9rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Recent History
                </h4>
              </div>

              <div className="history-list">
                {history.length === 0 ? (
                  <p
                    style={{
                      textAlign: "center",
                      color: "var(--text-muted)",
                      fontSize: "0.8rem",
                    }}
                  >
                    No history yet.
                  </p>
                ) : (
                  history.map((item) => (
                    <div key={item.id} className="history-item">
                      <div className="history-dot" />
                      <div className="history-content">
                        <span className="history-text">{item.text}</span>
                        <div className="history-meta">
                          <CheckCircle size={10} /> Completed at{" "}
                          {new Date(item.time).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Motion.div>

        </>
      )}
    </AnimatePresence>
  );
}

export default StatsDrawer;
