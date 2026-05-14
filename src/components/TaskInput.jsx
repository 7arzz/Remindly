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
} from "lucide-react";
import { supabase } from "../supabase";
import { toast } from "sonner";
import { useState } from "react";

function TaskInput({ addTask }) {
  const [text, setText] = useState("");
  const [time, setTime] = useState("");
  const [priority, setPriority] = useState("medium");
  const [detail, setDetail] = useState("");
  const [showDetail, setShowDetail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        // 2MB Limit
        toast.error("Image size too large (max 2MB)");
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
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
      const success = await addTask(text, time, priority, detail, imageUrl);
      if (success !== false) {
        setText("");
        setTime("");
        setPriority("medium");
        setDetail("");
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
    <div className="flex flex-col gap-5 p-5 sm:p-6 bg-bg-card/20">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 group">
          <Type
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent-primary transition-colors"
          />
          <input
            type="text"
            placeholder="What needs to be done?"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={loading}
            className="w-full bg-bg-secondary/50 border border-border-primary/50 rounded-xl py-3.5 pl-11 pr-4 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary focus:bg-bg-primary transition-all shadow-inner disabled:opacity-50"
          />
        </div>

        <div className="relative w-full sm:w-56 group">
          <Calendar
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent-primary transition-colors"
          />
          <input
            type="datetime-local"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            disabled={loading}
            className="w-full bg-bg-secondary/50 border border-border-primary/50 rounded-xl py-3.5 pl-11 pr-4 text-text-primary focus:outline-none focus:border-accent-primary focus:bg-bg-primary transition-all shadow-inner disabled:opacity-50"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowDetail(!showDetail)}
        disabled={loading}
        className="flex items-center gap-2 text-sm text-text-secondary hover:text-accent-primary transition-colors w-fit px-1 disabled:opacity-50"
      >
        <FileText size={16} />
        <span className="font-medium">Add detail (optional)</span>
        {showDetail ? (
          <ChevronUp size={14} className="opacity-50" />
        ) : (
          <ChevronDown size={14} className="opacity-50" />
        )}
      </button>

      {showDetail && (
        <div className="relative animate-in fade-in slide-in-from-top-2 duration-300 group">
          <FileText
            size={18}
            className="absolute left-4 top-4 text-text-muted group-focus-within:text-accent-primary transition-colors"
          />
          <textarea
            placeholder="Add some notes or details..."
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            disabled={loading}
            rows={3}
            className="w-full bg-bg-secondary/50 border border-border-primary/50 rounded-xl py-3.5 pl-11 pr-4 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary focus:bg-bg-primary transition-all shadow-inner resize-none disabled:opacity-50"
          />
        </div>
      )}

      <div className="flex flex-wrap gap-4 items-center">
        <label
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed transition-all cursor-pointer ${
            imagePreview
              ? "border-accent-primary/50 bg-accent-primary/5 text-accent-primary"
              : "border-border-primary/50 text-text-secondary hover:border-accent-primary/50 hover:text-accent-primary"
          } ${loading ? "opacity-50 pointer-events-none" : ""}`}
        >
          <ImageIcon size={18} />
          <span className="text-sm font-medium">
            {imagePreview ? "Change Photo" : "Add Photo"}
          </span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageChange}
            disabled={loading}
          />
        </label>

        {imagePreview && (
          <div className="relative group animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-accent-primary/30 shadow-lg">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full h-full object-cover"
              />
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
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
        <div className="flex bg-bg-secondary/80 p-1 rounded-xl border border-border-primary/50 flex-1 sm:flex-none">
          {["low", "medium", "high"].map((p) => (
            <button
              key={p}
              type="button"
              disabled={loading}
              className={`flex-1 sm:px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                priority === p
                  ? p === "low"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10"
                    : p === "medium"
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-lg shadow-amber-500/10"
                      : "bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-lg shadow-rose-500/10"
                  : "text-text-muted hover:text-text-secondary"
              } disabled:opacity-30`}
              onClick={() => setPriority(p)}
            >
              {p}
            </button>
          ))}
        </div>

        <button
          className={`btn-primary flex-1 ${!text || !time || loading ? "opacity-50 cursor-not-allowed scale-100" : ""}`}
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
