import { motion as Motion } from "framer-motion";


function ProgressBar({ tasks }) {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.done).length;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <div className="progress-section" style={{ marginBottom: "20px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "8px",
        }}
      >
        <span
          style={{
            fontSize: "0.85rem",
            color: "var(--text-secondary)",
            fontWeight: "500",
          }}
        >
          Daily Progress
        </span>
        <span
          style={{
            fontSize: "0.9rem",
            color: "var(--accent-primary)",
            fontWeight: "bold",
          }}
        >
          {percentage}%
        </span>
      </div>
      <div className="progress-track">
        <Motion.div
          className="progress-fill"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

export default ProgressBar;
