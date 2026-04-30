import { useState } from "react";
import { Send, Trash2, User as UserIcon } from "lucide-react";

function Answer({ answers = [], onAddAnswer, onDeleteAnswer, currentUser }) {
  const [newAnswer, setNewAnswer] = useState("");

  const handleAdd = () => {
    if (!newAnswer.trim()) return;
    onAddAnswer(newAnswer);
    setNewAnswer("");
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
        />
        <button className="primary" onClick={handleAdd} style={{ alignSelf: "flex-end", width: "auto" }}>
          <Send size={16} />
          Submit Answer
        </button>
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
