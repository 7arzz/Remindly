import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Pencil, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";

const EnvelopeModal = ({ task, isOpen, onClose, onUpdate }) => {
  const [envelopeOpen, setEnvelopeOpen] = useState(false);
  const [paperOut, setPaperOut] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [editDetail, setEditDetail] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setEnvelopeOpen(false);
      setPaperOut(false);
      setIsAnimating(false);
      setIsEditing(false);
    } else if (task) {
      setEditText(task.text);
      setEditDetail(task.detail || "");
    }
  }, [isOpen, task]);

  const handleToggle = () => {
    if (isAnimating || isEditing) return;
    setIsAnimating(true);

    if (!envelopeOpen) {
      // Opening sequence
      setEnvelopeOpen(true);
      setTimeout(() => {
        setPaperOut(true);
        setIsAnimating(false);
      }, 800);
    } else {
      // Closing sequence
      setPaperOut(false);
      setTimeout(() => {
        setEnvelopeOpen(false);
        setIsAnimating(false);
      }, 800);
    }
  };

  const handleSave = async () => {
    if (!editText.trim()) {
      toast.error("Title cannot be empty");
      return;
    }

    try {
      await onUpdate(task.id, {
        text: editText,
        detail: editDetail,
      });
      setIsEditing(false);
      toast.success("Task updated!");
    } catch (error) {
      toast.error("Failed to update task");
    }
  };

  if (!task) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="envelope-modal-overlay"
          onClick={(e) => e.target === e.currentTarget && !isEditing && onClose()}
        >
          <button 
            onClick={onClose}
            className="fixed top-6 right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all z-[1001]"
          >
            <X size={24} />
          </button>

          <div className="envelope-container">
            {/* Back of Envelope */}
            <div className="envelope-back"></div>
            
            {/* Paper with Task Content */}
            <div className={`envelope-paper custom-scrollbar ${paperOut ? 'out' : ''}`}>
              <div className="flex justify-between items-start mb-4 border-b-2 border-blue-500 pb-2">
                {isEditing ? (
                  <input
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="text-xl font-bold text-blue-800 bg-blue-50/50 border-none focus:outline-none w-full mr-2 rounded px-1"
                    placeholder="Task Title"
                    autoFocus
                  />
                ) : (
                  <h2 className="text-xl font-bold text-blue-800">
                    {task.text}
                  </h2>
                )}
                
                {paperOut && !isAnimating && (
                  <div className="flex gap-1">
                    {isEditing ? (
                      <>
                        <button 
                          onClick={() => setIsEditing(false)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
                          title="Cancel"
                        >
                          <RotateCcw size={16} />
                        </button>
                        <button 
                          onClick={handleSave}
                          className="p-1.5 text-emerald-500 hover:text-emerald-600 transition-colors"
                          title="Save"
                        >
                          <Save size={16} />
                        </button>
                      </>
                    ) : (
                      <button 
                        onClick={() => setIsEditing(true)}
                        className="p-1.5 text-blue-400 hover:text-blue-600 transition-colors"
                        title="Edit Task"
                      >
                        <Pencil size={16} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <section>
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Task Details</h3>
                  {isEditing ? (
                    <textarea
                      value={editDetail}
                      onChange={(e) => setEditDetail(e.target.value)}
                      className="w-full text-sm leading-relaxed text-slate-600 italic bg-slate-50 border-none focus:outline-none rounded p-2 min-h-[100px] resize-none"
                      placeholder="Add details..."
                    />
                  ) : (
                    <p className="text-sm leading-relaxed text-slate-600 italic">
                      {task.detail || "No additional details provided."}
                    </p>
                  )}
                </section>

                {task.image_url && !isEditing && (
                  <motion.section 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Attached Image</h3>
                    <div className="rounded-xl overflow-hidden border border-slate-100 shadow-sm group relative">
                      <img 
                        src={task.image_url} 
                        alt="Task Attachment" 
                        className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </motion.section>
                )}
                
                {(!isEditing && (task.answers && task.answers.length > 0)) ? (
                  <section>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-3">Answers / Solutions</h3>
                    <div className="space-y-3">
                      {task.answers.map((answer, idx) => (
                        <div key={answer.id || idx} className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 shadow-sm">
                          <p className="text-sm text-emerald-900 leading-tight mb-2 font-medium">{answer.text}</p>
                          <div className="flex justify-between items-center text-[9px] text-emerald-600/70 font-bold uppercase">
                            <span>{answer.user_name}</span>
                            <span>{new Date(answer.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : (!isEditing && task.answer) ? (
                   <section>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-2">Answer</h3>
                    <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 text-sm text-emerald-800">
                      {task.answer}
                    </div>
                  </section>
                ) : null}

                <div className="pt-6 border-t border-slate-100 flex justify-between items-end">
                  <div className="text-[10px] text-slate-400">
                    <p className="uppercase tracking-tighter">Deadline</p>
                    <p className="font-bold text-slate-600">{new Date(task.time).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-tighter text-slate-400">Status</p>
                    <p className={`text-xs font-black ${task.done ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {task.done ? 'COMPLETED' : 'PENDING'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Front Panels */}
            <div className="envelope-front-left"></div>
            <div className="envelope-front-right"></div>
            <div className="envelope-front-bottom"></div>

            {/* Top Flap */}
            <div className={`envelope-top-flap ${envelopeOpen ? 'open' : ''}`}></div>

            {/* Seal / Star Button */}
            <button 
              className={`envelope-star-btn ${envelopeOpen ? 'side' : ''} ${isEditing ? 'opacity-0 pointer-events-none' : ''}`}
              onClick={handleToggle}
            >
              {task.text.length > 15 ? task.text.substring(0, 15) + '...' : task.text}
            </button>
          </div>

          {!isEditing && (
            <div className="fixed bottom-10 text-white/60 text-sm font-medium animate-pulse">
              {envelopeOpen ? "Click to seal the envelope" : "Click the seal to read the message"}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EnvelopeModal;
