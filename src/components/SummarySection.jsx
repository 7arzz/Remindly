import { useState, useEffect } from "react";
import {
  FileText,
  Plus,
  Trash2,
  Edit3,
  Calendar,
  X,
  Loader2,
  User as UserIcon,
  Search,
  Image as ImageIcon,
  Sparkles,
  Brain,
  MessageSquare,
  File,
  Download,
  ExternalLink,
} from "lucide-react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { supabase } from "../supabase";
import { toast } from "sonner";
import { GoogleGenerativeAI } from "@google/generative-ai";
import SummaryChatModal from "./SummaryChatModal";
import SummaryDetailModal from "./SummaryDetailModal";

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

function SummarySection({ currentUser }) {
  const [summaries, setSummaries] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Form State
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [selectedSummaryForChat, setSelectedSummaryForChat] = useState(null);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [selectedSummaryForDetail, setSelectedSummaryForDetail] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    const fetchSummaries = async () => {
      const { data, error } = await supabase
        .from("summaries")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) console.error("Error fetching summaries:", error);
      else setSummaries(data || []);
    };

    fetchSummaries();

    const channel = supabase
      .channel("summaries_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "summaries" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setSummaries((prev) => [payload.new, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setSummaries((prev) =>
              prev.map((s) => (s.id === payload.new.id ? payload.new : s)),
            );
          } else if (payload.eventType === "DELETE") {
            setSummaries((prev) => prev.filter((s) => s.id !== payload.old.id));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setLoading(true);

    try {
      let finalImageUrl = imageUrl;

      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${currentUser.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("remindly_assets")
          .upload(filePath, imageFile);

        if (uploadError) {
          console.error("Upload error details:", uploadError);
          throw new Error(
            `Gagal mengupload gambar: ${uploadError.message || "Pastikan bucket 'remindly_assets' ada dan public."}`,
          );
        }

        const { data: publicUrlData } = supabase.storage
          .from("remindly_assets")
          .getPublicUrl(filePath);

        finalImageUrl = publicUrlData.publicUrl;
      }

      const summaryData = {
        title,
        content,
        date,
        image_url: finalImageUrl,
        user_id: currentUser.id,
        user_name:
          currentUser.user_metadata?.full_name ||
          currentUser.email.split("@")[0],
        user_email: currentUser.email,
      };

      if (editingId) {
        const { error } = await supabase
          .from("summaries")
          .update(summaryData)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("summaries")
          .insert([summaryData]);
        if (error) throw error;
      }

      resetForm();
    } catch (error) {
      console.error("Error saving summary:", error);
      toast.error(`Gagal menyimpan: ${error.message || "Periksa koneksi atau kebijakan database."}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (summary) => {
    toast("Delete Summary?", {
      description:
        "Are you sure you want to delete this summary? This action cannot be undone.",
      action: {
        label: "Delete",
        onClick: async () => {
          try {
            const { error } = await supabase
              .from("summaries")
              .delete()
              .eq("id", summary.id);
            if (error) throw error;
            toast.success("Summary deleted.");
          } catch (error) {
            console.error("Error deleting summary:", error);
            toast.error("Failed to delete summary.");
          }
        },
      },
      cancel: {
        label: "Cancel",
      },
    });
  };

  const handleEdit = (summary) => {
    setEditingId(summary.id);
    setTitle(summary.title);
    setContent(summary.content);
    setDate(summary.date);
    setImageUrl(summary.image_url || "");
    setImagePreview(summary.image_url || null);
    setImageFile(null);
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setTitle("");
    setContent("");
    setDate(new Date().toISOString().split("T")[0]);
    setImageFile(null);
    setImagePreview(null);
    setImageUrl("");
    setEditingId(null);
    setIsModalOpen(false);
    setIsScanning(false);
  };

  const handleAIScan = async () => {
    if (!imageFile) {
      toast.error("Silakan pilih foto terlebih dahulu.");
      return;
    }

    setIsScanning(true);
    try {
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

      // Convert image to base64
      const fileData = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(",")[1]);
        reader.readAsDataURL(imageFile);
      });

      const prompt =
        "Tolong analisis gambar catatan/dokumen ini. Berikan judul yang sangat singkat (maks 5 kata) dan isi rangkuman yang jelas dalam bahasa Indonesia. Format jawaban harus seperti ini:\nJudul: [isi judul]\nIsi: [isi rangkuman]";

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: fileData,
            mimeType: imageFile.type,
          },
        },
      ]);

      const response = await result.response;
      const text = response.text();

      // Parsing simple text format
      const titleMatch = text.match(/Judul:\s*(.*)/i);
      const contentMatch = text.match(/Isi:\s*([\s\S]*)/i);

      if (titleMatch && titleMatch[1]) setTitle(titleMatch[1].trim());
      if (contentMatch && contentMatch[1]) setContent(contentMatch[1].trim());

      toast.success("Berhasil memindai catatan dengan AI!");
    } catch (error) {
      console.error("AI Scan Error:", error);
      toast.error("Gagal memindai dengan AI. Pastikan API Key valid.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleAISummarize = async () => {
    if (!content.trim()) {
      toast.error("Tulis atau tempel teks yang ingin diringkas dahulu.");
      return;
    }

    setIsSummarizing(true);
    try {
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

      const prompt = `
        Tolong ringkas teks berikut menjadi poin-poin penting yang mudah dipahami dalam bahasa Indonesia.
        Gunakan format bullet points (•).
        Teks: "${content}"
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      setContent(response.text());
      toast.success("Teks berhasil diringkas!");
    } catch (error) {
      console.error("AI Summarize Error:", error);
      toast.error("Gagal meringkas teks.");
    } finally {
      setIsSummarizing(false);
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
        reader.onloadend = () => {
          setImagePreview(reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        setImagePreview("document");
      }
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageUrl("");
  };

  const filteredSummaries = summaries
    .filter(
      (s) =>
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.content.toLowerCase().includes(searchQuery.toLowerCase()),
    )
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent-primary transition-colors"
          />
          <input
            type="text"
            placeholder="Search summaries..."
            className="w-full bg-bg-secondary border border-border-primary/50 rounded-xl py-3.5 pl-11 pr-4 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary focus:bg-bg-primary transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button
          className="btn-primary py-3.5 px-6 shadow-xl shadow-accent-primary/10 whitespace-nowrap flex-1 sm:flex-none"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus size={20} />
          <span>New Summary</span>
        </button>
      </div>

      {filteredSummaries.length === 0 ? (
        <Motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 sm:p-12 text-center flex flex-col items-center justify-center gap-5 border border-border-primary/30 max-w-lg mx-auto w-full mt-4"
        >
          <div className="p-4 bg-accent-primary/10 text-accent-primary rounded-full animate-bounce">
            <Brain size={36} />
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-lg font-black text-text-primary">Belum Ada Catatan Ringkasan AI</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              Buat ringkasan baru atau unggah catatan Anda dengan mengeklik tombol{" "}
              <strong className="text-accent-primary">New Summary</strong> di atas.
            </p>
          </div>
          <div className="p-4 bg-bg-secondary/40 rounded-2xl border border-border-primary/20 text-xs text-text-muted leading-relaxed text-left flex gap-3">
            <MessageSquare size={20} className="text-accent-primary flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-text-secondary block mb-1">💡 Cara Menggunakan Tanya AI:</span>
              Setelah Anda membuat catatan ringkasan, tombol <strong className="text-accent-primary">"Tanya AI tentang Catatan Ini"</strong> akan otomatis muncul di bagian bawah setiap kartu catatan ringkasan Anda! Anda bisa menanyakan apa saja tentang teks maupun lampiran berkas Anda.
            </div>
          </div>
        </Motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AnimatePresence>
            {filteredSummaries.map((s) => (
              <Motion.div
                key={s.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="glass-card flex flex-col p-6 hover:translate-y-[-4px] active:scale-[0.98] group cursor-pointer"
                onClick={() => {
                  setSelectedSummaryForDetail(s);
                  setIsDetailModalOpen(true);
                }}
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-text-primary leading-tight group-hover:text-accent-primary transition-colors">
                    {s.title}
                  </h3>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    {s.user_email === currentUser.email && (
                      <>
                        <button
                          className="p-2 rounded-lg text-text-muted hover:text-accent-primary hover:bg-accent-primary/10 transition-all opacity-0 group-hover:opacity-100"
                          onClick={() => handleEdit(s)}
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          className="p-2 rounded-lg text-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100"
                          onClick={() => handleDelete(s)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {s.image_url && (
                  <div className="mb-4 rounded-xl overflow-hidden bg-bg-secondary/30 relative">
                    {getFileType(s.image_url) === "image" ? (
                      <img
                        src={s.image_url}
                        alt={s.title}
                        className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full bg-bg-secondary/20 p-4 rounded-xl border border-border-primary/20 flex items-center justify-between hover:border-accent-primary/30 transition-all">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-accent-primary/10 text-accent-primary border border-accent-primary/20 flex items-center justify-center flex-shrink-0">
                            {getFileType(s.image_url) === "pdf" ? (
                              <span className="text-[10px] font-black">PDF</span>
                            ) : getFileType(s.image_url) === "pptx" ? (
                              <span className="text-[10px] font-black">PPT</span>
                            ) : getFileType(s.image_url) === "docx" ? (
                              <span className="text-[10px] font-black">DOC</span>
                            ) : (
                              <File size={16} />
                            )}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-text-primary truncate">
                              {s.image_url.split("/").pop().split("?")[0]}
                            </span>
                            <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider">
                              {getFileType(s.image_url)} File
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <a
                            href={s.image_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-accent-primary/10 text-accent-primary hover:bg-accent-primary hover:text-white rounded-lg transition-all"
                            title="Open in Browser"
                          >
                            <ExternalLink size={12} />
                          </a>
                          <a
                            href={s.image_url}
                            download
                            className="p-2 bg-accent-primary/10 text-accent-primary hover:bg-accent-primary hover:text-white rounded-lg transition-all"
                            title="Download File"
                          >
                            <Download size={12} />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <p className="text-text-secondary text-sm leading-relaxed mb-6 line-clamp-3">
                  {s.content}
                </p>

                <div className="mt-auto pt-4 border-t border-border-primary/30 flex justify-between items-center">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-text-muted">
                    <Calendar size={12} className="text-accent-primary/40" />
                    <span>{s.date}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-accent-primary">
                    <UserIcon size={12} />
                    <span>{s.user_name}</span>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedSummaryForChat(s);
                    setIsChatModalOpen(true);
                  }}
                  className="mt-4 w-full py-2.5 bg-accent-primary/10 text-accent-primary border border-accent-primary/20 rounded-xl flex items-center justify-center gap-2 text-xs font-bold hover:bg-accent-primary hover:text-white transition-all shadow-sm group-hover:shadow-accent-primary/20"
                >
                  <MessageSquare size={14} />
                  <span>Tanya AI tentang Catatan Ini</span>
                </button>
              </Motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {createPortal(
        <AnimatePresence>
          {isModalOpen && (
            <Motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 sm:p-6"
              onClick={resetForm}
            >
              <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                <Motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="bg-bg-card border border-border-primary rounded-[32px] w-full max-w-xl shadow-2xl relative"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-6 sm:p-8 flex flex-col gap-6">
                    <div className="flex justify-between items-center">
                      <h2 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight">
                        {editingId ? "Edit Summary" : "Create New Summary"}
                      </h2>
                      <button
                        className="p-2 rounded-xl bg-bg-secondary text-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                        onClick={resetForm}
                      >
                        <X size={24} />
                      </button>
                    </div>

                    <form
                      onSubmit={handleSubmit}
                      className="flex flex-col gap-5"
                    >
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-black uppercase tracking-widest text-text-muted ml-1">
                          Summary Title
                        </label>
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="e.g., Mathematics Lecture Notes"
                          className="w-full bg-bg-secondary border border-border-primary/50 rounded-xl py-3 px-4 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary transition-all"
                          required
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-black uppercase tracking-widest text-text-muted ml-1">
                          Date
                        </label>
                        <input
                          type="date"
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          className="w-full bg-bg-secondary border border-border-primary/50 rounded-xl py-3 px-4 text-text-primary focus:outline-none focus:border-accent-primary transition-all color-scheme-dark"
                          required
                        />
                      </div>

                      <div className="flex flex-col gap-2 relative">
                        <div className="flex justify-between items-center ml-1">
                          <label className="text-xs font-black uppercase tracking-widest text-text-muted">
                            Content / Notes
                          </label>
                          <button
                            type="button"
                            onClick={handleAISummarize}
                            disabled={isSummarizing || !content.trim()}
                            className="text-[10px] font-bold text-accent-primary flex items-center gap-1 hover:underline disabled:opacity-50 whitespace-nowrap"
                          >
                            {isSummarizing ? (
                              <Loader2 size={10} className="animate-spin" />
                            ) : (
                              <Sparkles size={10} />
                            )}
                            {isSummarizing
                              ? "Summarizing..."
                              : "Summarize with AI"}
                          </button>
                        </div>
                        <textarea
                          value={content}
                          onChange={(e) => setContent(e.target.value)}
                          placeholder="Briefly describe the summary..."
                          className="w-full bg-bg-secondary border border-border-primary/50 rounded-xl p-4 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary transition-all min-h-[120px] resize-none"
                          required
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-black uppercase tracking-widest text-text-muted ml-1">
                          Attachment (Photo/Doc) (Optional)
                        </label>
                        {imagePreview ? (
                          <div className="relative w-full rounded-xl overflow-hidden border border-border-primary/50 group bg-bg-secondary p-6 flex flex-col items-center justify-center min-h-[120px]">
                            {imagePreview === "document" || (imagePreview.startsWith("http") && getFileType(imagePreview) !== "image") ? (
                              <div className="flex flex-col items-center justify-center text-accent-primary gap-2">
                                <div className="p-3.5 bg-accent-primary/10 rounded-2xl border border-accent-primary/20">
                                  <FileText size={32} />
                                </div>
                                <span className="text-sm font-bold text-text-primary text-center truncate max-w-[300px]">
                                  {imageFile ? imageFile.name : imagePreview.split("/").pop().split("?")[0]}
                                </span>
                                <span className="text-[10px] font-black uppercase text-text-muted">
                                  {imageFile ? imageFile.name.split(".").pop() : getFileType(imagePreview)} Document
                                </span>
                              </div>
                            ) : (
                              <img
                                src={imagePreview}
                                alt="Preview"
                                className="w-full h-48 object-cover rounded-xl"
                              />
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                              {(imageFile?.type.startsWith("image/") || (imagePreview.startsWith("http") && getFileType(imagePreview) === "image")) && (
                                <button
                                  type="button"
                                  onClick={handleAIScan}
                                  disabled={isScanning}
                                  className="bg-accent-primary text-white px-4 py-2 rounded-full hover:bg-accent-primary/90 transition-all shadow-lg flex items-center gap-2 text-sm font-bold disabled:opacity-50"
                                >
                                  {isScanning ? (
                                    <Loader2 size={16} className="animate-spin" />
                                  ) : (
                                    <Sparkles size={16} />
                                  )}
                                  {isScanning ? "Scanning..." : "Scan with AI"}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={removeImage}
                                disabled={isScanning}
                                className="bg-rose-500 text-white p-2 rounded-full hover:bg-rose-600 transition-colors shadow-lg disabled:opacity-50"
                              >
                                <Trash2 size={20} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <label className="w-full bg-bg-secondary border border-border-primary/50 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-accent-primary hover:bg-accent-primary/5 transition-all">
                            <div className="p-3 bg-bg-primary rounded-full text-accent-primary/80 mb-2">
                              <ImageIcon size={24} />
                            </div>
                            <span className="text-sm font-medium text-text-primary">
                              Click to upload a file (Photo, PDF, PPT, Word, Excel)
                            </span>
                            <span className="text-xs text-text-muted">
                              JPEG, PNG, PDF, PPT, DOCX, XLSX (Max 5MB)
                            </span>
                            <input
                              type="file"
                              accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
                              onChange={handleImageChange}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>

                      <button
                        type="submit"
                        className={`btn-primary w-full py-4 mt-2 ${loading ? "opacity-80" : ""}`}
                        disabled={loading}
                      >
                        {loading ? (
                          <div className="flex items-center gap-3">
                            <Loader2 className="animate-spin" size={20} />
                            <span>Saving...</span>
                          </div>
                        ) : (
                          <span className="flex items-center gap-2 whitespace-nowrap">
                            {editingId ? (
                              <Edit3 size={18} />
                            ) : (
                              <Plus size={18} />
                            )}
                            {editingId ? "Update Summary" : "Create Summary"}
                          </span>
                        )}
                      </button>
                    </form>
                  </div>
                </Motion.div>
              </div>
            </Motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
      <SummaryChatModal
        isOpen={isChatModalOpen}
        onClose={() => setIsChatModalOpen(false)}
        summary={selectedSummaryForChat}
      />
      <SummaryDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        summary={selectedSummaryForDetail}
        currentUser={currentUser}
        onEdit={(s) => { setIsDetailModalOpen(false); handleEdit(s); }}
        onDelete={(s) => { setIsDetailModalOpen(false); handleDelete(s); }}
        onAskAI={(s) => {
          setIsDetailModalOpen(false);
          setSelectedSummaryForChat(s);
          setIsChatModalOpen(true);
        }}
      />
    </div>
  );
}

export default SummarySection;
