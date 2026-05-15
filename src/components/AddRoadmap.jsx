import React, { useState, useRef } from "react";
import { Plus, Lightbulb, Sparkles, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { toast } from "sonner";

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
  const [loading, setLoading] = useState(false);
  const [placeholderIdx] = useState(() =>
    Math.floor(Math.random() * PLACEHOLDER_SUGGESTIONS.length),
  );
  const inputRef = useRef();

  const handleGenerateAI = async () => {
    const goal = value.trim();
    if (!goal) {
      toast.error("Please type your goal first!");
      return;
    }

    setLoading(true);
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

      const prompt = `
        Tolong buatkan roadmap/rencana belajar untuk tujuan: "${goal}"
        Berikan jawaban dalam format JSON murni:
        {
          "title": "Judul yang menarik dan ringkas",
          "steps": [
            {"id": "random-uuid-1", "text": "Langkah pertama yang spesifik", "done": false},
            {"id": "random-uuid-2", "text": "Langkah kedua...", "done": false}
          ]
        }
        
        Berikan maksimal 7 langkah saja yang paling penting.
        PENTING: Hanya balas dengan JSON valid, tanpa teks tambahan.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const responseText = response.text();
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Format AI tidak valid.");

      const data = JSON.parse(jsonMatch[0]);
      
      // Ensure IDs are valid
      const processedSteps = (data.steps || []).map(step => ({
        ...step,
        id: step.id || crypto.randomUUID(),
        done: false
      }));

      onAdd(data.title || goal, processedSteps);
      setValue("");
      toast.success("AI has generated your roadmap!");
    } catch (error) {
      console.error("AI Roadmap Error:", error);
      toast.error("Failed to generate roadmap. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
          disabled={!value.trim() || loading}
          style={{ opacity: value.trim() ? 1 : 0.65 }}
        >
          {loading ? <Loader2 size={17} className="animate-spin" /> : <Plus size={17} strokeWidth={2.5} />}
          {loading ? "Generating..." : "Create Map"}
        </motion.button>
        
        <motion.button
          type="button"
          onClick={handleGenerateAI}
          className="ai-btn"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          disabled={!value.trim() || loading}
        >
          {loading ? <Loader2 size={17} className="animate-spin" /> : <Sparkles size={17} />}
          <span>{loading ? "Thinking..." : "AI Generate"}</span>
        </motion.button>
      </form>
    </div>
  );
}
