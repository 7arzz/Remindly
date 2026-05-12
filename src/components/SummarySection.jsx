import { useState, useEffect } from "react";
import { 
  FileText, Plus, Trash2, Edit3, Calendar, 
  X, Loader2, User as UserIcon, Search 
} from "lucide-react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { supabase } from "../supabase";

function SummarySection({ currentUser }) {
  const [summaries, setSummaries] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Form State
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const fetchSummaries = async () => {
      const { data, error } = await supabase
        .from('summaries')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) console.error("Error fetching summaries:", error);
      else setSummaries(data || []);
    };

    fetchSummaries();

    const channel = supabase
      .channel('summaries_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'summaries' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setSummaries(prev => [payload.new, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setSummaries(prev => prev.map(s => s.id === payload.new.id ? payload.new : s));
        } else if (payload.eventType === 'DELETE') {
          setSummaries(prev => prev.filter(s => s.id !== payload.old.id));
        }
      })
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
      const summaryData = {
        title,
        content,
        date,
        user_id: currentUser.id,
        user_name: currentUser.user_metadata?.full_name || currentUser.email.split('@')[0],
        user_email: currentUser.email,
      };

      if (editingId) {
        const { error } = await supabase
          .from('summaries')
          .update(summaryData)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('summaries')
          .insert([summaryData]);
        if (error) throw error;
      }

      resetForm();
    } catch (error) {
      console.error("Error saving summary:", error);
      alert("Error saving summary.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (summary) => {
    if (!window.confirm("Are you sure you want to delete this summary?")) return;
    try {
      const { error } = await supabase
        .from('summaries')
        .delete()
        .eq('id', summary.id);
      if (error) throw error;
    } catch (error) {
      console.error("Error deleting summary:", error);
    }
  };

  const handleEdit = (summary) => {
    setEditingId(summary.id);
    setTitle(summary.title);
    setContent(summary.content);
    setDate(summary.date);
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setTitle("");
    setContent("");
    setDate(new Date().toISOString().split('T')[0]);
    setEditingId(null);
    setIsModalOpen(false);
  };

  const filteredSummaries = summaries
    .filter(s => 
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Search summaries..." 
            className="w-full bg-bg-secondary/50 border border-border-primary/50 rounded-xl py-3.5 pl-11 pr-4 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary focus:bg-bg-primary transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button 
          className="btn-primary py-3.5 px-6 shadow-xl shadow-accent-primary/10 whitespace-nowrap" 
          onClick={() => setIsModalOpen(true)}
        >
          <Plus size={20} />
          <span>New Summary</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AnimatePresence>
          {filteredSummaries.map((s) => (
            <Motion.div 
              key={s.id} 
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="glass-card flex flex-col p-6 hover:translate-y-[-4px] active:scale-[0.98] group"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-text-primary leading-tight group-hover:text-accent-primary transition-colors">{s.title}</h3>
                <div className="flex gap-1">
                  {s.user_email === currentUser.email && (
                    <>
                      <button className="p-2 rounded-lg text-text-muted hover:text-accent-primary hover:bg-accent-primary/10 transition-all opacity-0 group-hover:opacity-100" onClick={() => handleEdit(s)}>
                        <Edit3 size={16}/>
                      </button>
                      <button className="p-2 rounded-lg text-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100" onClick={() => handleDelete(s)}>
                        <Trash2 size={16}/>
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              <p className="text-text-secondary text-sm leading-relaxed mb-6 line-clamp-3">{s.content}</p>
              
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
            </Motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4 sm:p-6" onClick={resetForm}>
            <Motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-bg-card border border-border-primary rounded-[32px] w-full max-w-xl max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl relative"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 sm:p-8 flex flex-col gap-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-black text-text-primary tracking-tight">
                    {editingId ? "Edit Summary" : "Create New Summary"}
                  </h2>
                  <button className="p-2 rounded-xl bg-bg-secondary text-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-all" onClick={resetForm}>
                    <X size={24}/>
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-black uppercase tracking-widest text-text-muted ml-1">Summary Title</label>
                    <input 
                      type="text" 
                      value={title} 
                      onChange={e => setTitle(e.target.value)}
                      placeholder="e.g., Mathematics Lecture Notes"
                      className="w-full bg-bg-secondary/50 border border-border-primary/50 rounded-xl py-3 px-4 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary transition-all"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-black uppercase tracking-widest text-text-muted ml-1">Date</label>
                    <input 
                      type="date" 
                      value={date} 
                      onChange={e => setDate(e.target.value)}
                      className="w-full bg-bg-secondary/50 border border-border-primary/50 rounded-xl py-3 px-4 text-text-primary focus:outline-none focus:border-accent-primary transition-all"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-black uppercase tracking-widest text-text-muted ml-1">Content / Notes</label>
                    <textarea 
                      value={content} 
                      onChange={e => setContent(e.target.value)}
                      placeholder="Briefly describe the summary..."
                      className="w-full bg-bg-secondary/50 border border-border-primary/50 rounded-xl p-4 text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary transition-all min-h-[120px] resize-none"
                      required
                    />
                  </div>

                  <button 
                    type="submit" 
                    className={`btn-primary w-full py-4 mt-2 ${loading ? 'opacity-80' : ''}`} 
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="flex items-center gap-3">
                        <Loader2 className="animate-spin" size={20} /> 
                        <span>Saving...</span>
                      </div>
                    ) : (
                      <span className="flex items-center gap-2">
                        {editingId ? <Edit3 size={18} /> : <Plus size={18} />}
                        {editingId ? "Update Summary" : "Create Summary"}
                      </span>
                    )}
                  </button>
                </form>
              </div>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default SummarySection;
