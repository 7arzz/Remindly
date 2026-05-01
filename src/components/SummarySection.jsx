import { useState, useEffect } from "react";
import { compressImage } from "../utils/imageUtils";
import { 
  FileText, Plus, Trash2, Edit3, Calendar, Download, 
  File, X, Upload, Loader2, User as UserIcon, Search 
} from "lucide-react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { 
  collection, onSnapshot, addDoc, updateDoc, 
  deleteDoc, doc, query, orderBy 
} from "firebase/firestore";
import { 
  ref, uploadBytesResumable, getDownloadURL, deleteObject 
} from "firebase/storage";
import { db, storage } from "../firebase";

function SummarySection({ currentUser }) {
  const [summaries, setSummaries] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  // Form State
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [file, setFile] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "summaries"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSummaries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Firestore Snapshot Error (Summaries):", error);
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setLoading(true);

    let fileUrl = "";
    let fileName = "";

    try {
      if (file) {
        const compressedFile = await compressImage(file);
        const storageRef = ref(storage, `summaries/${Date.now()}_${compressedFile.name}`);
        const uploadTask = uploadBytesResumable(storageRef, compressedFile);

        const url = await new Promise((resolve, reject) => {
          uploadTask.on('state_changed', 
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress);
            }, 
            (error) => reject(error), 
            async () => {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(downloadURL);
            }
          );
        });

        fileUrl = url;
        fileName = file.name;
      }

      const summaryData = {
        title,
        content,
        date,
        fileUrl,
        fileName,
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email.split('@')[0],
        userEmail: currentUser.email,
        createdAt: new Date().toISOString(),
      };

      if (editingId) {
        // If editing, merge with old data if no new file
        const oldSummary = summaries.find(s => s.id === editingId);
        await updateDoc(doc(db, "summaries", editingId), {
          ...summaryData,
          fileUrl: fileUrl || oldSummary.fileUrl,
          fileName: fileName || oldSummary.fileName,
        });
      } else {
        await addDoc(collection(db, "summaries"), summaryData);
      }

      resetForm();
    } catch (error) {
      console.error("Error saving summary:", error);
      let errorMessage = "Error saving summary.";
      if (error.code === 'storage/unauthorized') {
        errorMessage = "Unauthorized: Check Firebase Storage rules.";
      } else if (error.code === 'permission-denied') {
        errorMessage = "Permission Denied: Check Firestore rules.";
      } else {
        errorMessage += " " + (error.message || "Unknown error.");
      }
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (summary) => {
    if (!window.confirm("Are you sure you want to delete this summary?")) return;
    try {
      if (summary.fileUrl) {
        const fileRef = ref(storage, summary.fileUrl);
        await deleteObject(fileRef).catch(e => console.log("File already deleted or missing"));
      }
      await deleteDoc(doc(db, "summaries", summary.id));
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
    setFile(null);
    setEditingId(null);
    setIsModalOpen(false);
    setUploadProgress(0);
  };

  const filteredSummaries = summaries
    .filter(s => 
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <div className="summary-section">
      <div className="summary-header-actions">
        <div className="search-bar-container" style={{ flex: 1 }}>
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search summaries..." 
            className="search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button className="primary add-summary-btn" onClick={() => setIsModalOpen(true)}>
          <Plus size={20} />
          New Summary
        </button>
      </div>

      <div className="summaries-grid">
        {filteredSummaries.map((s) => (
          <Motion.div 
            key={s.id} 
            layout
            className="glass-card summary-card"
          >
            <div className="summary-card-header">
              <h3 className="summary-card-title">{s.title}</h3>
              <div className="summary-card-actions">
                {s.userEmail === currentUser.email && (
                  <>
                    <button className="icon-btn" onClick={() => handleEdit(s)}><Edit3 size={16}/></button>
                    <button className="icon-btn delete" onClick={() => handleDelete(s)}><Trash2 size={16}/></button>
                  </>
                )}
              </div>
            </div>
            
            <p className="summary-card-content">{s.content}</p>
            
            {s.fileUrl && (
              <a href={s.fileUrl} target="_blank" rel="noopener noreferrer" className="file-attachment">
                <File size={14} />
                <span>{s.fileName}</span>
                <Download size={14} className="download-icon" />
              </a>
            )}

            <div className="summary-card-footer">
              <div className="summary-meta">
                <Calendar size={12} />
                <span>{s.date}</span>
              </div>
              <div className="summary-author">
                <UserIcon size={12} />
                <span>{s.userName}</span>
              </div>
            </div>
          </Motion.div>
        ))}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="modal-overlay" onClick={resetForm}>
            <Motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="detail-modal summary-modal"
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>{editingId ? "Edit Summary" : "Create New Summary"}</h2>
                <button className="icon-btn" onClick={resetForm}><X size={24}/></button>
              </div>

              <form onSubmit={handleSubmit} className="summary-form">
                <div className="input-field">
                  <label>Summary Title</label>
                  <input 
                    type="text" 
                    value={title} 
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g., Mathematics Lecture Notes"
                    required
                  />
                </div>

                <div className="input-field">
                  <label>Date</label>
                  <input 
                    type="date" 
                    value={date} 
                    onChange={e => setDate(e.target.value)}
                    required
                  />
                </div>

                <div className="input-field">
                  <label>Description / Content</label>
                  <textarea 
                    value={content} 
                    onChange={e => setContent(e.target.value)}
                    placeholder="Briefly describe the summary..."
                    className="answer-textarea"
                    required
                  />
                </div>

                <div className="input-field">
                  <label>File Attachment (Optional)</label>
                  <div className="file-upload-zone">
                    <input 
                      type="file" 
                      id="summary-file"
                      style={{ display: 'none' }}
                      onChange={e => setFile(e.target.files[0])}
                    />
                    <label htmlFor="summary-file" className="file-upload-label">
                      {file ? (
                        <div className="file-selected">
                          <File size={20} />
                          <span>{file.name}</span>
                          <X size={16} onClick={(e) => { e.preventDefault(); setFile(null); }} className="remove-file" />
                        </div>
                      ) : (
                        <div className="file-placeholder">
                          <Upload size={24} />
                          <span>Click to upload file (PDF, Doc, Image)</span>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                <button type="submit" className="primary" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="spin" size={20} /> 
                      {uploadProgress > 0 && uploadProgress < 100 
                        ? `Uploading ${Math.round(uploadProgress)}%` 
                        : "Saving..."}
                    </>
                  ) : (
                    <>{editingId ? "Update Summary" : "Save Summary"}</>
                  )}
                </button>
              </form>
            </Motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default SummarySection;
