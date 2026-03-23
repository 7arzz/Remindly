import { useState } from "react";
import { Plus, Calendar, Type, AlertCircle, Bell, Trash2, Zap } from "lucide-react";

function TaskInput({ addTask }) {
  const [text, setText] = useState("");
  const [time, setTime] = useState("");
  const [priority, setPriority] = useState("medium");
  const [reminderMinutes, setReminderMinutes] = useState(0);

  const handleAdd = () => {
    if (!text || !time) return;
    addTask(text, time, priority, reminderMinutes);
    setText("");
    setTime("");
    setPriority("medium");
    setReminderMinutes(0);
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

      <div className="reminder-selector glass-card" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.03)' }}>
        <Bell size={16} style={{ color: 'var(--text-muted)' }} />
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', flex: 1 }}>Remind me:</span>
        <select 
          value={reminderMinutes} 
          onChange={(e) => setReminderMinutes(parseInt(e.target.value))}
          className="mini-select"
          style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', fontWeight: 'bold', cursor: 'pointer' }}
        >
          <option value={0}>At time</option>
          <option value={5}>5 mins before</option>
          <option value={15}>15 mins before</option>
          <option value={30}>30 mins before</option>
          <option value={60}>1 hour before</option>
          <option value={1440}>1 day before</option>
        </select>
      </div>


      <div style={{ display: 'flex', gap: '12px' }}>
        <button className="primary" onClick={handleAdd} style={{ flex: 1 }}>
          <Plus size={20} />
          Add Reminder
        </button>
      </div>
    </div>
  );
}

export default TaskInput;
