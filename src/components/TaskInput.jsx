import {
  Plus,
  Calendar,
  Type,
  FileText,
  ChevronDown,
  ChevronUp,
  X,
  Loader2,
  Image as ImageIcon,
  Bell,
  File,
  Download,
  ExternalLink,
} from "lucide-react";
import { supabase } from "../supabase";
import { toast } from "sonner";
import { useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Sparkles } from "lucide-react";

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

function TaskInput({ addTask }) {
  const [text, setText] = useState("");
  const [time, setTime] = useState("");
  const [priority, setPriority] = useState("medium");
  const [detail, setDetail] = useState("");
  const [showDetail, setShowDetail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [reminderOffset, setReminderOffset] = useState(0); // in minutes
  const [isParsing, setIsParsing] = useState(false);

  const handleAIScan = async () => {
    if (!text.trim()) {
      toast.error("Please type something first!");
      return;
    }

    setIsParsing(true);
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("API Key Gemini tidak ditemukan di file .env");
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

      const now = new Date().toLocaleString("en-US", {
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      const prompt = `
        Tolong analisis kalimat tugas ini: "${text}"
        Waktu sekarang adalah: ${now}
        
        Ekstrak informasi berikut dalam format JSON murni:
        {
          "title": "Judul tugas yang ringkas",
          "time": "YYYY-MM-DDTHH:mm",
          "priority": "low" | "medium" | "high",
          "detail": "tambahan catatan jika ada"
        }

        Ketentuan:
        1. Jika tanggal tidak disebutkan, gunakan tanggal hari ini (${new Date().toISOString().split("T")[0]}).
        2. Berikan hanya JSON, jangan ada teks penjelasan lain.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const responseText = response.text();

      // Extract JSON more robustly
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("AI tidak memberikan respon dalam format yang benar.");
      }

      const data = JSON.parse(jsonMatch[0]);

      if (data.title) setText(data.title);
      if (data.time) setTime(data.time);
      if (data.priority) setPriority(data.priority);
      if (data.detail) {
        setDetail(data.detail);
        setShowDetail(true);
      }

      toast.success("AI has organized your task!");
    } catch (error) {
      console.error("AI Parse Error:", error);
      toast.error(error.message || "Gagal memproses dengan AI.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size too large (max 5MB)");
        return;
      }
      setImageFile(file);
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => setImagePreview(reader.result);
        reader.readAsDataURL(file);
      } else {
        setImagePreview("document");
      }
    }
  };

  const handleAdd = async () => {
    if (!text || !time || loading) return;
    setLoading(true);
    let imageUrl = null;

    try {
      // 1. Upload Image if exists
      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `tasks/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("remindly_assets")
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("remindly_assets").getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

      // 2. Add Task
      // time is stored in datetime-local local format (YYYY-MM-DDTHH:mm).
      // Supabase timestamptz expects UTC ISO, so convert at SAVE.
      const timeIsoUtc = new Date(time).toISOString();
      const success = await addTask(
        text,
        timeIsoUtc,
        priority,
        detail,
        imageUrl,
        reminderOffset,
      );

      if (success !== false) {
        setText("");
        setTime("");
        setPriority("medium");
        setDetail("");
        setReminderOffset(0);
        setShowDetail(false);
        setImageFile(null);
        setImagePreview(null);
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="premium-task-card">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 group">
          <Type
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent-primary transition-colors z-10"
          />
          <input
            type="text"
            placeholder="What needs to be done?"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={loading}
            className="premium-input"
          />
          <button
            type="button"
            onClick={handleAIScan}
            disabled={isParsing || loading}
            title="Parse with Gemini AI"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-accent-primary/10 text-accent-primary hover:bg-accent-primary hover:text-bg-primary transition-all disabled:opacity-50 z-10"
          >
            {isParsing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Sparkles size={16} />
            )}
          </button>
        </div>

        <div className="relative w-full sm:w-56 group">
          <Calendar
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent-primary transition-colors z-10"
          />
          <input
            type="datetime-local"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            disabled={loading}
            className="premium-input premium-input-datetime"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowDetail(!showDetail)}
        disabled={loading}
        className="premium-accordion-trigger mt-1 disabled:opacity-50"
      >
        <FileText size={16} />
        <span className="font-semibold">Add detail (optional)</span>
        {showDetail ? (
          <ChevronUp size={14} className="opacity-50" />
        ) : (
          <ChevronDown size={14} className="opacity-50" />
        )}
      </button>

      {showDetail && (
        <div className="relative animate-in fade-in slide-in-from-top-2 duration-300 group mt-2">
          <FileText
            size={18}
            className="absolute left-4 top-4 text-text-muted group-focus-within:text-accent-primary transition-colors z-10"
          />
          <textarea
            placeholder="Add some notes or details..."
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            disabled={loading}
            rows={3}
            className="premium-input pl-11 pt-3.5 resize-none"
          />
        </div>
      )}

      <div className="flex flex-wrap gap-4 items-center mt-2">
        <label
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed transition-all cursor-pointer ${
            imagePreview
              ? "border-accent-primary bg-accent-primary/10 text-accent-primary"
              : "border-border-primary/50 text-text-secondary hover:border-accent-primary hover:bg-accent-glow"
          } ${loading ? "opacity-50 pointer-events-none" : ""}`}
        >
          <ImageIcon size={18} />
          <span className="text-sm font-semibold">
            {imagePreview ? "Change Attachment" : "Add Attachment"}
          </span>
          <input
            type="file"
            accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
            className="hidden"
            onChange={handleImageChange}
            disabled={loading}
          />
        </label>

        {imagePreview && (
          <div className="relative group animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-accent-primary/30 shadow-lg flex items-center justify-center bg-bg-secondary">
              {imagePreview === "document" || (imageFile && !imageFile.type.startsWith("image/")) ? (
                <div className="flex flex-col items-center justify-center p-1 text-accent-primary">
                  <FileText size={20} />
                  <span className="text-[8px] font-black uppercase mt-1 truncate max-w-[50px]">
                    {imageFile ? imageFile.name.split(".").pop() : "DOC"}
                  </span>
                </div>
              ) : (
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <button
              onClick={() => {
                setImageFile(null);
                setImagePreview(null);
              }}
              className="absolute -top-2 -right-2 p-1 bg-rose-500 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* Reminder Selector */}
        <div className="relative group flex-1 sm:flex-none min-w-[170px]">
          <Bell
            size={18}
            className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors z-10 ${
              reminderOffset > 0 ? "text-accent-primary" : "text-text-muted"
            }`}
          />
          <select
            value={reminderOffset}
            onChange={(e) => setReminderOffset(parseInt(e.target.value))}
            disabled={loading}
            className="premium-select"
          >
            <option value={0}>No Reminder</option>
            <option value={30}>30 Minutes Before</option>
            <option value={60}>1 Hour Before</option>
            <option value={120}>2 Hours Before</option>
            <option value={1440}>1 Day Before</option>
          </select>
          <ChevronDown
            size={14}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none z-10"
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center mt-3">
        <div className="priority-pill-container flex-1 sm:flex-none">
          {["low", "medium", "high"].map((p) => (
            <button
              key={p}
              type="button"
              disabled={loading}
              className={`priority-pill priority-pill-${p} ${
                priority === p ? "active" : "text-text-muted"
              }`}
              onClick={() => setPriority(p)}
            >
              {p}
            </button>
          ))}
        </div>

        <button
          className={`premium-btn-submit flex-1 ${!text || !time || loading ? "opacity-50 cursor-not-allowed scale-100" : ""}`}
          onClick={handleAdd}
          disabled={!text || !time || loading}
        >
          {loading ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <Plus size={20} />
          )}
          <span>{loading ? "Adding..." : "Add Task"}</span>
        </button>
      </div>
    </div>
  );
}

export default TaskInput;
