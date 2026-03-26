import { useState } from "react";
import { Plus, Calendar, Type } from "lucide-react";

function TaskInput({ addTask }) {
  const [text, setText] = useState("");
  const [time, setTime] = useState("");
  const [priority, setPriority] = useState("medium");

  const handleAdd = () => {
    if (!text || !time) return;
    addTask(text, time, priority);
    setText("");
    setTime("");
    setPriority("medium");
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


      <div style={{ display: 'flex', gap: '12px' }}>
        <button className="primary" onClick={handleAdd} style={{ flex: 1 }}>
          <Plus size={20} />
          Add Task
        </button>
      </div>
    </div>
  );
}

export default TaskInput;
