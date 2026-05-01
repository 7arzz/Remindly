import { Plus, Calendar, Type, FileText, ChevronDown, ChevronUp, Camera, X } from "lucide-react";

function TaskInput({ addTask }) {
  const [text, setText] = useState("");
  const [time, setTime] = useState("");
  const [priority, setPriority] = useState("medium");
  const [detail, setDetail] = useState("");
  const [showDetail, setShowDetail] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleAdd = () => {
    if (!text || !time) return;
    addTask(text, time, priority, detail, imageFile);
    setText("");
    setTime("");
    setPriority("medium");
    setDetail("");
    setShowDetail(false);
    setImageFile(null);
    setImagePreview(null);
  };

  return (
    <div className="input-group">
      <div style={{ position: 'relative' }}>
        <Type size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          type="text"
          placeholder="What needs to be done?"
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={{ paddingLeft: '40px' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Calendar size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="datetime-local"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            style={{ paddingLeft: '40px' }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowDetail(!showDetail)}
        style={{
          background: 'transparent',
          color: 'var(--text-secondary)',
          fontSize: '0.85rem',
          padding: '6px 0',
          justifyContent: 'flex-start',
        }}
      >
        <FileText size={16} />
        Add detail (optional)
        {showDetail ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {showDetail && (
        <textarea
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          placeholder="Describe the task in more detail..."
          className="answer-textarea"
          style={{ minHeight: '80px' }}
        />
      )}

      <div className="priority-selector">
        {['low', 'medium', 'high'].map((p) => (
          <button
            key={p}
            type="button"
            className={`priority-btn ${priority === p ? `active ${p}` : ''}`}
            onClick={() => setPriority(p)}
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      {imagePreview && (
        <div className="answer-image-preview" style={{ marginBottom: '12px' }}>
          <img src={imagePreview} alt="Preview" />
          <button className="remove-preview" onClick={() => { setImageFile(null); setImagePreview(null); }}>
            <X size={14} />
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <input 
          type="file" 
          id="task-image" 
          accept="image/*" 
          style={{ display: 'none' }} 
          onChange={handleFileChange}
        />
        <label htmlFor="task-image" className="tool-btn" style={{ height: '48px', padding: '0 16px' }}>
          <Camera size={20} />
        </label>

        <button className="primary" onClick={handleAdd} style={{ flex: 1 }}>
          <Plus size={20} />
          Add Task
        </button>
      </div>
    </div>
  );
}

export default TaskInput;
