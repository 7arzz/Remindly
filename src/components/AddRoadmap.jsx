import React, { useState, useRef } from "react";
import { Plus, Lightbulb } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const PLACEHOLDER_SUGGESTIONS = [
  "Learn React from scratch…",
  "Master TypeScript…",
  "Build a fullstack app…",
  "Study Machine Learning…",
  "Launch my side project…",
  "Get a new job in tech…",
];

export default function AddRoadmap({ onAdd }) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [placeholderIdx] = useState(() =>
    Math.floor(Math.random() * PLACEHOLDER_SUGGESTIONS.length),
  );
  const inputRef = useRef();

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      inputRef.current?.focus();
      return;
    }
    onAdd(trimmed);
    setValue("");
  };

  return (
    <div className="add-roadmap-container">
      <div className="section-label">New Roadmap</div>
      <form className="add-form" onSubmit={handleSubmit}>
        <motion.input
          ref={inputRef}
          type="text"
          className="main-input"
          placeholder={PLACEHOLDER_SUGGESTIONS[placeholderIdx]}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          animate={focused ? { scale: 1.005 } : { scale: 1 }}
          transition={{ duration: 0.15 }}
          autoComplete="off"
        />
        <motion.button
          type="submit"
          className="add-btn"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          disabled={!value.trim()}
          style={{ opacity: value.trim() ? 1 : 0.65 }}
        >
          <Plus size={17} strokeWidth={2.5} />
          Create Map
        </motion.button>
      </form>
    </div>
  );
}
