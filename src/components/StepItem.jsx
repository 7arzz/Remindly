import React from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export default function StepCard({
  step,
  index,
  total,
  onToggle,
  onDelete,
  onMoveLeft,
  onMoveRight,
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.85, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.18 } }}
      transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
      className={`step-card${step.done ? " done" : ""}`}
      onClick={onToggle}
      role="button"
      tabIndex={0}
      aria-label={`${step.text} — ${step.done ? "completed" : "pending"}. Click to toggle.`}
      onKeyDown={(e) =>
        e.key === "Enter" || e.key === " " ? onToggle() : null
      }
    >
      <div className="step-number">Step {index + 1}</div>
      <div className="step-content">
        {step.done ? (
          <CheckCircle2 size={18} className="step-check-mark" strokeWidth={2} />
        ) : (
          <Circle
            size={18}
            style={{ color: "var(--text-muted)", opacity: 0.4 }}
            strokeWidth={1.5}
          />
        )}
        <p className="step-text">{step.text}</p>
      </div>

      <div className="step-actions" onClick={(e) => e.stopPropagation()}>
        {onMoveLeft && (
          <button
            className="btn-step btn-step-pending"
            onClick={onMoveLeft}
            title="Move left"
            aria-label="Move step left"
          >
            <ChevronLeft size={12} />
          </button>
        )}
        <button
          className={`btn-step ${step.done ? "btn-step-pending" : "btn-step-done"}`}
          onClick={onToggle}
          title={step.done ? "Mark pending" : "Mark done"}
        >
          {step.done ? <Circle size={12} /> : <CheckCircle2 size={12} />}
        </button>
        {onMoveRight && (
          <button
            className="btn-step btn-step-pending"
            onClick={onMoveRight}
            title="Move right"
            aria-label="Move step right"
          >
            <ChevronRight size={12} />
          </button>
        )}
        <button
          className="btn-step btn-step-delete"
          onClick={onDelete}
          title="Delete step"
          aria-label="Delete this step"
        >
          <Trash2 size={11} />
        </button>
      </div>
    </motion.div>
  );
}
