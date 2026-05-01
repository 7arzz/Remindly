import { useState } from "react";
import { Send, Trash2, User as UserIcon, Camera, X, Loader2 } from "lucide-react";

function Answer({ answers = [], onAddAnswer, onDeleteAnswer, currentUser }) {
  const [newAnswer, setNewAnswer] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleAdd = async () => {
    if (!newAnswer.trim() && !imageFile) return;
    setIsSubmitting(true);
    try {
      await onAddAnswer(newAnswer, imageFile);
      setNewAnswer("");
      setImageFile(null);
      setImagePreview(null);
    } catch (error) {
      console.error("Error adding answer:", error);
      alert("Failed to post answer. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="answer-section">
      <h3 style={{ marginBottom: "16px", color: "var(--text-secondary)", fontSize: "1rem" }}>
        Collaborative Answers & Notes
      </h3>
      
      <div className="answer-input-container">
        <textarea
          value={newAnswer}
          onChange={(e) => setNewAnswer(e.target.value)}
          placeholder="Share your answer or notes with everyone..."
          className="answer-textarea"
          disabled={isSubmitting}
        />
        
        {imagePreview && (
          <div className="answer-image-preview">
            <img src={imagePreview} alt="Preview" />
            <button className="remove-preview" onClick={() => { setImageFile(null); setImagePreview(null); }}>
              <X size={14} />
            </button>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          <div className="answer-tools">
            <input 
              type="file" 
              id="answer-image" 
              accept="image/*" 
              style={{ display: 'none' }} 
              onChange={handleFileChange}
              disabled={isSubmitting}
            />
            <label htmlFor="answer-image" className="tool-btn">
              <Camera size={18} />
              <span>Add Image</span>
            </label>
          </div>
          
          <button 
            className="primary" 
            onClick={handleAdd} 
            disabled={isSubmitting || (!newAnswer.trim() && !imageFile)}
            style={{ width: "auto" }}
          >
            {isSubmitting ? (
              <><Loader2 className="spin" size={16} /> Posting...</>
            ) : (
              <><Send size={16} /> Submit Answer</>
            )}
          </button>
        </div>
      </div>

      <div className="answers-list">
        {answers.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", textAlign: "center", marginTop: "24px" }}>
            No answers yet. Be the first to help!
          </p>
        ) : (
          answers.map((ans) => (
            <div key={ans.id} className="answer-item">
              <div className="answer-author">
                <UserIcon size={12} />
                <span>{ans.userName}</span>
              </div>
              <div className="answer-text">{ans.text}</div>
              {ans.imageUrl && (
                <div className="answer-media">
                  <img src={ans.imageUrl} alt="Answer attachment" onClick={() => window.open(ans.imageUrl, '_blank')} />
                </div>
              )}
              <div className="answer-date">
                {new Date(ans.createdAt).toLocaleString([], {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
              
              {/* Only allow deleting own answers or if user is task creator (logic simplified to own answer) */}
              {ans.userEmail === currentUser.email && (
                <button
                  className="icon-btn delete answer-delete"
                  onClick={() => onDeleteAnswer(ans.id)}
                  title="Delete your answer"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Answer;
