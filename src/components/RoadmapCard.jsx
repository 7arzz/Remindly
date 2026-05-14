import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, Trash2, Check, X, Plus } from "lucide-react";
import StepCard from "./StepItem";

export default function RoadmapCard({
  roadmap,
  index,
  total,
  onDeleteRoadmap,
  onEditRoadmap,
  onAddStep,
  onToggleStep,
  onDeleteStep,
  onReorderStep,
}) {
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(roadmap.title);
  const [stepInput, setStepInput] = useState("");

  const {
    done,
    total: stepTotal,
    pct,
  } = useMemo(() => {
    const d = roadmap.steps.filter((s) => s.done).length;
    const t = roadmap.steps.length;
    return { done: d, total: t, pct: t === 0 ? 0 : Math.round((d / t) * 100) };
  }, [roadmap.steps]);

  const handleEditSave = () => {
    const trimmed = editVal.trim();
    if (trimmed && trimmed !== roadmap.title)
      onEditRoadmap(roadmap.id, trimmed);
    setEditing(false);
  };

  const handleEditKeyDown = (e) => {
    if (e.key === "Enter") handleEditSave();
    if (e.key === "Escape") {
      setEditVal(roadmap.title);
      setEditing(false);
    }
  };

  const handleAddStep = (e) => {
    e.preventDefault();
    const trimmed = stepInput.trim();
    if (!trimmed) return;
    onAddStep(roadmap.id, trimmed);
    setStepInput("");
  };

  const cardNum = String(total - index).padStart(2, "0");

  return (
    <motion.div layout className="roadmap-card">
      {/* Header */}
      <div className="card-header">
        <div className="card-title-area">
          <div className="card-number">Map #{cardNum}</div>
          {editing ? (
            <div className="edit-title-form">
              <input
                className="main-input"
                value={editVal}
                onChange={(e) => setEditVal(e.target.value)}
                onKeyDown={handleEditKeyDown}
                autoFocus
              />
              <button
                className="btn-icon btn-success"
                onClick={handleEditSave}
                title="Save"
              >
                <Check size={14} />
              </button>
              <button
                className="btn-icon btn-danger"
                onClick={() => {
                  setEditVal(roadmap.title);
                  setEditing(false);
                }}
                title="Cancel"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <h3>{roadmap.title}</h3>
          )}
        </div>

        {!editing && (
          <div className="card-actions">
            <button
              className="btn-icon"
              onClick={() => setEditing(true)}
              title="Edit title"
            >
              <Pencil size={14} />
            </button>
            <button
              className="btn-icon btn-danger"
              onClick={() => onDeleteRoadmap(roadmap.id)}
              title="Delete roadmap"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Progress */}
      {stepTotal > 0 && (
        <div className="progress-container">
          <div className="progress-info">
            <span>
              {done} of {stepTotal} steps
            </span>
            <span className="progress-percent">{pct}%</span>
          </div>
          <div className="pb-bg">
            <motion.div
              className="pb-fill"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
            />
          </div>
        </div>
      )}

      {/* Steps flow */}
      <div className="roadmap-flow-container">
        {roadmap.steps.length === 0 ? (
          <p className="empty-steps">
            No steps yet — add your first milestone below.
          </p>
        ) : (
          <div className="roadmap-flow">
            <AnimatePresence initial={false}>
              {roadmap.steps.map((step, idx) => (
                <div key={step.id} className="step-item-wrapper">
                  {idx > 0 && (
                    <div
                      className={`flow-connector${roadmap.steps[idx - 1].done ? " active" : ""}`}
                    />
                  )}
                  <StepCard
                    step={step}
                    index={idx}
                    total={roadmap.steps.length}
                    onToggle={() => onToggleStep(roadmap.id, step.id)}
                    onDelete={() => onDeleteStep(roadmap.id, step.id)}
                    onMoveLeft={
                      idx > 0
                        ? () => onReorderStep(roadmap.id, idx, idx - 1)
                        : null
                    }
                    onMoveRight={
                      idx < roadmap.steps.length - 1
                        ? () => onReorderStep(roadmap.id, idx, idx + 1)
                        : null
                    }
                  />
                </div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Add step form */}
      <form className="add-step-form" onSubmit={handleAddStep}>
        <input
          type="text"
          className="step-input"
          placeholder="Add a step…"
          value={stepInput}
          onChange={(e) => setStepInput(e.target.value)}
        />
        <button
          type="submit"
          className="btn-icon btn-success"
          disabled={!stepInput.trim()}
          style={{
            opacity: stepInput.trim() ? 1 : 0.5,
            width: 36,
            height: 36,
            flexShrink: 0,
          }}
          title="Add step"
        >
          <Plus size={15} />
        </button>
      </form>
    </motion.div>
  );
}
